import { describe, expect, it } from "vitest";
import { clearLocalAttempts, clearLocalAttemptsForDate, deleteLocalPlayer, getLocalLeaderboard, getLocalPersonalBest, readLocalAttempts, saveLocalAttempt } from "@/lib/local-attempts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("offline local preview", () => {
  it("keeps every test attempt and shows one best row per participant", () => {
    const storage = memoryStorage();
    const firstPlayer = "11111111-1111-4111-8111-111111111111";
    const secondPlayer = "22222222-2222-4222-8222-222222222222";
    saveLocalAttempt({ playerId: firstPlayer, nickname: "Ada", elapsedMs: 9_950, attemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", createdAt: "2026-10-26T10:00:00Z" }, storage);
    saveLocalAttempt({ playerId: firstPlayer, nickname: "Ada", elapsedMs: 10_005, attemptId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", createdAt: "2026-10-26T10:01:00Z" }, storage);
    saveLocalAttempt({ playerId: secondPlayer, nickname: "Lin", elapsedMs: 10_100, attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", createdAt: "2026-10-26T10:02:00Z" }, storage);

    expect(readLocalAttempts(storage)).toHaveLength(3);
    const board = getLocalLeaderboard(storage);
    expect(board.qualified.map((row) => row.player_id)).toEqual([firstPlayer, secondPlayer]);
    expect(board.qualified[0]?.elapsed_ms).toBe("10005");
    expect(board.qualified.map((row) => row.attempt_count)).toEqual([2, 1]);
    expect(board.qualified.map((row) => row.placement)).toEqual([1, 2]);
    expect(board.notQualified).toEqual([]);
    expect(getLocalPersonalBest(firstPlayer, storage)).toMatchObject({
      elapsed_ms: "10005",
      deviation_ms: "5",
      is_qualified: true,
      placement: 1,
      attempt_count: 2,
    });
  });

  it("rejects invalid local attempts rather than creating misleading test rows", () => {
    const storage = memoryStorage();
    expect(saveLocalAttempt({ playerId: "invalid", nickname: "Ada", elapsedMs: 10_000 }, storage)).toBeNull();
    expect(saveLocalAttempt({ playerId: "11111111-1111-4111-8111-111111111111", nickname: "  ", elapsedMs: 10_000 }, storage)).toBeNull();
    expect(readLocalAttempts(storage)).toEqual([]);
  });

  it("deletes all local attempts for one participant and leaves other participants intact", () => {
    const storage = memoryStorage();
    const firstPlayer = "11111111-1111-4111-8111-111111111111";
    const secondPlayer = "22222222-2222-4222-8222-222222222222";
    saveLocalAttempt({ playerId: firstPlayer, nickname: "Ada", elapsedMs: 10_000, attemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, storage);
    saveLocalAttempt({ playerId: firstPlayer, nickname: "Ada", elapsedMs: 10_005, attemptId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }, storage);
    saveLocalAttempt({ playerId: secondPlayer, nickname: "Lin", elapsedMs: 10_010, attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }, storage);

    expect(deleteLocalPlayer(firstPlayer, storage)).toBe(2);
    expect(readLocalAttempts(storage).map((attempt) => attempt.player_id)).toEqual([secondPlayer]);
    expect(getLocalLeaderboard(storage).qualified).toHaveLength(1);
  });

  it("can reset the complete local leaderboard", () => {
    const storage = memoryStorage();
    saveLocalAttempt({ playerId: "11111111-1111-4111-8111-111111111111", nickname: "Ada", elapsedMs: 10_000 }, storage);
    saveLocalAttempt({ playerId: "22222222-2222-4222-8222-222222222222", nickname: "Lin", elapsedMs: 10_005 }, storage);

    expect(clearLocalAttempts(storage)).toBe(2);
    expect(readLocalAttempts(storage)).toEqual([]);
    expect(getLocalLeaderboard(storage).qualified).toEqual([]);
  });

  it("resets only the selected Oslo calendar date", () => {
    const storage = memoryStorage();
    const todayPlayer = "11111111-1111-4111-8111-111111111111";
    const oldPlayer = "22222222-2222-4222-8222-222222222222";
    saveLocalAttempt({ playerId: todayPlayer, nickname: "I dag", elapsedMs: 10_000, createdAt: "2026-10-25T23:30:00.000Z" }, storage);
    saveLocalAttempt({ playerId: oldPlayer, nickname: "I går", elapsedMs: 10_005, createdAt: "2026-10-25T10:00:00.000Z" }, storage);

    expect(clearLocalAttemptsForDate("2026-10-26", storage)).toBe(1);
    expect(readLocalAttempts(storage).map((attempt) => attempt.player_id)).toEqual([oldPlayer]);
  });
});
