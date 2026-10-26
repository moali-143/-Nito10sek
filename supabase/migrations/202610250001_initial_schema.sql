create extension if not exists pgcrypto with schema extensions;

create table public.players (
  id uuid primary key,
  nickname text not null check (char_length(nickname) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_nickname_no_controls check (nickname !~ '[[:cntrl:]]')
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  elapsed_ms numeric(24,12) not null check (elapsed_ms > 0 and elapsed_ms <= 900000),
  deviation_ms numeric(24,12) generated always as (elapsed_ms - 10000::numeric) stored,
  absolute_deviation_ms numeric(24,12) generated always as (abs(elapsed_ms - 10000::numeric)) stored,
  is_qualified boolean generated always as (elapsed_ms between 9900::numeric and 10100::numeric) stored,
  is_exact_hit boolean generated always as (elapsed_ms = 10000::numeric) stored,
  created_at timestamptz not null default now()
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 1)
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index attempts_player_best_idx
  on public.attempts (player_id, is_qualified desc, absolute_deviation_ms asc, created_at asc);
create index attempts_created_at_idx on public.attempts (created_at desc);
create index game_sessions_player_idx on public.game_sessions (player_id, started_at desc);

alter table public.players enable row level security;
alter table public.attempts enable row level security;
alter table public.game_sessions enable row level security;
alter table public.rate_limits enable row level security;
alter table public.admin_users enable row level security;

revoke all on public.players, public.attempts, public.game_sessions, public.rate_limits, public.admin_users from anon, authenticated;
grant all on public.players, public.attempts, public.game_sessions, public.rate_limits, public.admin_users to service_role;

create or replace view public.public_leaderboard
with (security_invoker = true)
as
with ranked_attempts as (
  select
    p.id as player_id,
    p.nickname,
    a.id as attempt_id,
    a.elapsed_ms,
    a.deviation_ms,
    a.absolute_deviation_ms,
    a.is_qualified,
    a.is_exact_hit,
    a.created_at,
    count(*) over (partition by p.id) as attempt_count,
    min(a.created_at) filter (where a.is_qualified) over (partition by p.id) as first_qualified_at,
    row_number() over (
      partition by p.id
      order by a.is_qualified desc, a.absolute_deviation_ms asc, a.created_at asc, a.id asc
    ) as player_attempt_rank
  from public.players p
  join public.attempts a on a.player_id = p.id
), best_per_player as (
  select player_id, nickname, attempt_id, elapsed_ms, deviation_ms,
    absolute_deviation_ms, is_qualified, is_exact_hit, created_at,
    attempt_count, first_qualified_at
  from ranked_attempts
  where player_attempt_rank = 1
)
select
  row_number() over (
    order by is_qualified desc, absolute_deviation_ms asc, created_at asc, player_id asc
  ) as placement,
  player_id,
  nickname,
  attempt_id,
  elapsed_ms,
  deviation_ms,
  absolute_deviation_ms,
  is_qualified,
  is_exact_hit,
  created_at,
  attempt_count,
  first_qualified_at
from best_per_player;

revoke all on public.public_leaderboard from public, anon, authenticated;
grant select on public.public_leaderboard to service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_key) > 128 then
    return false;
  end if;

  insert into public.rate_limits as current_limit (key, window_started_at, request_count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_started_at = case
      when current_limit.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else current_limit.window_started_at
    end,
    request_count = case
      when current_limit.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else current_limit.request_count + 1
    end
  returning request_count into v_count;

  if random() < 0.02 then
    delete from public.rate_limits where window_started_at < now() - interval '1 day';
  end if;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create or replace function public.submit_attempt(
  p_session_id uuid,
  p_player_id uuid,
  p_elapsed_ms numeric
) returns table (
  attempt_id uuid,
  elapsed_ms numeric,
  deviation_ms numeric,
  absolute_deviation_ms numeric,
  is_qualified boolean,
  is_exact_hit boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.game_sessions%rowtype;
  v_now timestamptz := now();
  v_server_elapsed_ms numeric;
  v_attempt public.attempts%rowtype;
begin
  select * into v_session
  from public.game_sessions
  where id = p_session_id and player_id = p_player_id
  for update;

  if not found or v_session.submitted_at is not null then
    raise exception 'invalid_session';
  end if;
  if p_elapsed_ms <= 0 or p_elapsed_ms > 900000 then
    raise exception 'invalid_duration';
  end if;
  if v_session.started_at < v_now - interval '15 minutes' then
    raise exception 'expired_session';
  end if;

  v_server_elapsed_ms := extract(epoch from (v_now - v_session.started_at)) * 1000;
  -- Allow bounded network spread while rejecting implausibly early or stale claims.
  if abs(v_server_elapsed_ms - p_elapsed_ms) > 3000 then
    raise exception 'duration_mismatch';
  end if;

  insert into public.attempts (player_id, elapsed_ms)
  values (p_player_id, p_elapsed_ms)
  returning * into v_attempt;

  update public.game_sessions set submitted_at = v_now where id = p_session_id;

  return query select
    v_attempt.id,
    v_attempt.elapsed_ms,
    v_attempt.deviation_ms,
    v_attempt.absolute_deviation_ms,
    v_attempt.is_qualified,
    v_attempt.is_exact_hit,
    v_attempt.created_at;
end;
$$;

revoke all on function public.submit_attempt(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.submit_attempt(uuid, uuid, numeric) to service_role;
