export const TARGET_MS = 10_000;
export const QUALIFICATION_MIN_MS = 9_900;
export const QUALIFICATION_MAX_MS = 10_100;
export const MAX_NICKNAME_LENGTH = 24;
export const MAX_PUBLIC_LEADERBOARD_ENTRIES = 100;

export type AttemptView = {
  player_id: string;
  nickname: string;
  attempt_id: string;
  elapsed_ms: string | number;
  deviation_ms: string | number;
  absolute_deviation_ms?: string | number;
  is_qualified: boolean;
  is_exact_hit: boolean;
  created_at: string;
  placement?: number;
  attempt_count?: number;
  first_qualified_at?: string | null;
};

export type Leaderboard = {
  qualified: AttemptView[];
  notQualified: AttemptView[];
};

export function normalizeNickname(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const nickname = input.trim();
  if (!nickname || [...nickname].length > MAX_NICKNAME_LENGTH) return null;
  if (/[\p{Cc}\p{Cf}]/u.test(nickname)) return null;
  return nickname;
}

export function toStoredMilliseconds(input: unknown): string | null {
  if (typeof input !== "number" || !Number.isFinite(input)) return null;
  if (input < 0 || input > 900_000) return null;
  // PostgreSQL stores this decimal in numeric(24,12), preserving timer precision.
  return input.toString();
}

export function isQualified(elapsedMs: number): boolean {
  return Number.isFinite(elapsedMs) && elapsedMs >= QUALIFICATION_MIN_MS && elapsedMs <= QUALIFICATION_MAX_MS;
}

export function isExactHit(elapsedMs: number): boolean {
  return Number.isFinite(elapsedMs) && elapsedMs === TARGET_MS;
}

export function signedDeviationMs(elapsedMs: number): number {
  return elapsedMs - TARGET_MS;
}

export function absoluteDeviationMs(row: Pick<AttemptView, "elapsed_ms" | "deviation_ms" | "absolute_deviation_ms">): number {
  return row.absolute_deviation_ms === undefined
    ? Math.abs(Number(row.deviation_ms))
    : Number(row.absolute_deviation_ms);
}

export function formatSeconds(elapsedMs: number | string, fractionDigits = 3): string {
  const seconds = (typeof elapsedMs === "string" ? Number(elapsedMs) : elapsedMs) / 1000;
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(seconds);
}

export function formatMilliseconds(milliseconds: number | string, fractionDigits = 3): string {
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(typeof milliseconds === "string" ? Number(milliseconds) : milliseconds);
}

export function buildLeaderboard(rows: AttemptView[], limit = Number.MAX_SAFE_INTEGER): Leaderboard {
  const byPlayer = new Map<string, AttemptView>();
  for (const row of rows) {
    const current = byPlayer.get(row.player_id);
    if (!current || compareRows(row, current) < 0) byPlayer.set(row.player_id, row);
  }
  const unique = [...byPlayer.values()].sort(compareRows);
  return {
    qualified: unique.filter((row) => row.is_qualified).slice(0, limit),
    notQualified: unique.filter((row) => !row.is_qualified).slice(0, limit),
  };
}

function compareRows(a: AttemptView, b: AttemptView): number {
  if (a.is_qualified !== b.is_qualified) return a.is_qualified ? -1 : 1;
  const deviationDifference = absoluteDeviationMs(a) - absoluteDeviationMs(b);
  return deviationDifference || Date.parse(a.created_at) - Date.parse(b.created_at) || a.attempt_id.localeCompare(b.attempt_id) || a.player_id.localeCompare(b.player_id);
}

export function sortLeaderboard(rows: AttemptView[]): AttemptView[] {
  return [...rows].sort(compareRows);
}

export function limitLeaderboard(board: Leaderboard, limit = MAX_PUBLIC_LEADERBOARD_ENTRIES): Leaderboard {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : Number.MAX_SAFE_INTEGER;
  const rows = sortLeaderboard([...board.qualified, ...board.notQualified]).slice(0, safeLimit);
  return {
    qualified: rows.filter((row) => row.is_qualified),
    notQualified: rows.filter((row) => !row.is_qualified),
  };
}
