import {
  buildLeaderboard,
  isExactHit,
  isQualified,
  limitLeaderboard,
  normalizeNickname,
  signedDeviationMs,
  sortLeaderboard,
  type AttemptView,
} from "@/lib/challenge";

export const LOCAL_ATTEMPTS_KEY = "nito10sek-local-attempts";

type LocalStorageLike = Pick<Storage, "getItem" | "setItem">;
type NewLocalAttempt = {
  playerId: string;
  nickname: string;
  elapsedMs: number;
  createdAt?: string;
  attemptId?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function browserStorage(storage?: LocalStorageLike): LocalStorageLike | null {
  if (storage) return storage;
  return typeof window === "undefined" ? null : window.localStorage;
}

export function readLocalAttempts(storage?: LocalStorageLike): AttemptView[] {
  const target = browserStorage(storage);
  if (!target) return [];
  try {
    const parsed: unknown = JSON.parse(target.getItem(LOCAL_ATTEMPTS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): AttemptView[] => {
      if (typeof value !== "object" || value === null) return [];
      const item = value as Partial<AttemptView>;
      const nickname = normalizeNickname(item.nickname);
      const elapsedMs = Number(item.elapsed_ms);
      if (
        typeof item.player_id !== "string" || !uuidPattern.test(item.player_id) ||
        typeof item.attempt_id !== "string" || !uuidPattern.test(item.attempt_id) ||
        !nickname || !Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs > 900_000 ||
        typeof item.created_at !== "string" || !Number.isFinite(Date.parse(item.created_at))
      ) return [];
      const deviation = signedDeviationMs(elapsedMs);
      return [{
        player_id: item.player_id,
        nickname,
        attempt_id: item.attempt_id,
        elapsed_ms: String(elapsedMs),
        deviation_ms: String(deviation),
        absolute_deviation_ms: String(Math.abs(deviation)),
        is_qualified: isQualified(elapsedMs),
        is_exact_hit: isExactHit(elapsedMs),
        created_at: item.created_at,
      }];
    });
  } catch {
    return [];
  }
}

export function saveLocalAttempt(
  input: NewLocalAttempt,
  storage?: LocalStorageLike,
): AttemptView | null {
  const target = browserStorage(storage);
  const nickname = normalizeNickname(input.nickname);
  if (
    !target || !uuidPattern.test(input.playerId) || !nickname ||
    !Number.isFinite(input.elapsedMs) || input.elapsedMs <= 0 || input.elapsedMs > 900_000
  ) return null;

  const deviation = signedDeviationMs(input.elapsedMs);
  const attempt: AttemptView = {
    player_id: input.playerId,
    nickname,
    attempt_id: input.attemptId ?? crypto.randomUUID(),
    elapsed_ms: String(input.elapsedMs),
    deviation_ms: String(deviation),
    absolute_deviation_ms: String(Math.abs(deviation)),
    is_qualified: isQualified(input.elapsedMs),
    is_exact_hit: isExactHit(input.elapsedMs),
    created_at: input.createdAt ?? new Date().toISOString(),
  };
  const attempts = readLocalAttempts(target);
  attempts.push(attempt);
  try {
    target.setItem(LOCAL_ATTEMPTS_KEY, JSON.stringify(attempts));
    return attempt;
  } catch {
    return null;
  }
}

export function deleteLocalPlayer(playerId: string, storage?: LocalStorageLike): number {
  const target = browserStorage(storage);
  if (!target || !uuidPattern.test(playerId)) return 0;
  const attempts = readLocalAttempts(target);
  const remaining = attempts.filter((attempt) => attempt.player_id !== playerId);
  const removed = attempts.length - remaining.length;
  if (!removed) return 0;
  try {
    target.setItem(LOCAL_ATTEMPTS_KEY, JSON.stringify(remaining));
    return removed;
  } catch {
    return 0;
  }
}

export function clearLocalAttempts(storage?: LocalStorageLike): number {
  const target = browserStorage(storage);
  if (!target) return 0;
  const participantCount = new Set(readLocalAttempts(target).map((attempt) => attempt.player_id)).size;
  try {
    target.setItem(LOCAL_ATTEMPTS_KEY, "[]");
    return participantCount;
  } catch {
    return 0;
  }
}

export function clearLocalAttemptsForDate(dateKey: string, storage?: LocalStorageLike): number {
  const target = browserStorage(storage);
  if (!target || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return 0;
  const attempts = readLocalAttempts(target);
  const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const osloDate = (createdAt: string) => {
    const parts = dayFormatter.formatToParts(new Date(createdAt));
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return year && month && day ? `${year}-${month}-${day}` : "";
  };
  const removedParticipants = new Set(attempts.filter((attempt) => osloDate(attempt.created_at) === dateKey).map((attempt) => attempt.player_id));
  if (!removedParticipants.size) return 0;
  const remaining = attempts.filter((attempt) => osloDate(attempt.created_at) !== dateKey);
  try {
    target.setItem(LOCAL_ATTEMPTS_KEY, JSON.stringify(remaining));
    return removedParticipants.size;
  } catch {
    return 0;
  }
}

export function getLocalLeaderboard(storage?: LocalStorageLike) {
  const attempts = readLocalAttempts(storage);
  const board = limitLeaderboard(buildLeaderboard(attempts, Number.MAX_SAFE_INTEGER));
  const ordered = sortLeaderboard([...board.qualified, ...board.notQualified]);
  const ranked = new Map(ordered.map((row, index) => [row.player_id, {
    ...row,
    placement: index + 1,
    attempt_count: attempts.filter((attempt) => attempt.player_id === row.player_id).length,
    first_qualified_at: attempts
      .filter((attempt) => attempt.player_id === row.player_id && attempt.is_qualified)
      .map((attempt) => attempt.created_at)
      .sort()[0] ?? null,
  }]));
  return {
    configured: false,
    qualified: board.qualified.map((row) => ranked.get(row.player_id)!),
    notQualified: board.notQualified.map((row) => ranked.get(row.player_id)!),
  };
}

export function getLocalPersonalBest(playerId: string, storage?: LocalStorageLike) {
  const attempts = readLocalAttempts(storage);
  const bestRows = buildLeaderboard(attempts, Number.MAX_SAFE_INTEGER);
  const rows = sortLeaderboard([...bestRows.qualified, ...bestRows.notQualified]);
  const index = rows.findIndex((row) => row.player_id === playerId);
  const best = rows[index];
  if (!best) return null;
  return {
    elapsed_ms: String(best.elapsed_ms),
    deviation_ms: String(best.deviation_ms),
    is_qualified: best.is_qualified,
    placement: index + 1,
    attempt_count: attempts.filter((attempt) => attempt.player_id === playerId).length,
  };
}
