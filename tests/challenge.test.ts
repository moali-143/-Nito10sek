import { describe, expect, it } from "vitest";
import {
  buildLeaderboard,
  limitLeaderboard,
  formatSeconds,
  isExactHit,
  isQualified,
  normalizeNickname,
  signedDeviationMs,
  sortLeaderboard,
} from "@/lib/challenge";
import type { AttemptView } from "@/lib/challenge";

describe("qualification window", () => {
  it.each([
    [9_899, false],
    [9_900, true],
    [9_950, true],
    [10_000, true],
    [10_100, true],
    [10_101, false],
  ])("classifies %i ms as qualified=%s", (elapsedMs, qualified) => {
    expect(isQualified(elapsedMs)).toBe(qualified);
  });

  it("keeps exact 10,000 ms distinct while allowing the full qualification window", () => {
    expect(isExactHit(10_000)).toBe(true);
    expect(isExactHit(9_999)).toBe(false);
    expect(isQualified(9_999)).toBe(true);
  });

  it("uses the unrounded measurement and computes signed deviation", () => {
    expect(formatSeconds(10_100.0001)).toBe("10,100");
    expect(isQualified(10_100.0001)).toBe(false);
    expect(signedDeviationMs(9_950)).toBe(-50);
    expect(signedDeviationMs(10_050)).toBe(50);
  });
});

describe("nickname validation", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeNickname("  Ada  ")).toBe("Ada");
  });

  it("rejects empty, overlong, and control-character names", () => {
    expect(normalizeNickname("   ")).toBeNull();
    expect(normalizeNickname("a".repeat(25))).toBeNull();
    expect(normalizeNickname("Ada\nLovelace")).toBeNull();
  });

  it("counts Unicode code points as characters", () => {
    expect(normalizeNickname("😀".repeat(24))).not.toBeNull();
    expect(normalizeNickname("😀".repeat(25))).toBeNull();
  });
});

const row = (overrides: Partial<AttemptView>): AttemptView => ({
  player_id: "player-1",
  nickname: "Ada",
  attempt_id: "attempt-1",
  elapsed_ms: "10000",
  deviation_ms: "0",
  absolute_deviation_ms: "0",
  is_qualified: true,
  is_exact_hit: true,
  created_at: "2026-10-25T12:00:00.000Z",
  ...overrides,
});

describe("leaderboard rules", () => {
  it("returns every participant by default instead of stopping at ten", () => {
    const rows = Array.from({ length: 15 }, (_, index) => row({
      player_id: `player-${index}`,
      nickname: `Deltaker ${index + 1}`,
      attempt_id: `attempt-${index}`,
      elapsed_ms: String(10_000 + index),
      deviation_ms: String(index),
      absolute_deviation_ms: String(index),
    }));

    expect(buildLeaderboard(rows).qualified).toHaveLength(15);
  });

  it("shows at most 100 participants total, with qualified participants first", () => {
    const rows = [
      ...Array.from({ length: 60 }, (_, index) => row({
        player_id: `qualified-${index}`,
        attempt_id: `qualified-attempt-${index}`,
        elapsed_ms: String(10_000 + index),
        deviation_ms: String(index),
        absolute_deviation_ms: String(index),
      })),
      ...Array.from({ length: 60 }, (_, index) => row({
        player_id: `near-${index}`,
        attempt_id: `near-attempt-${index}`,
        elapsed_ms: String(10_101 + index),
        deviation_ms: String(101 + index),
        absolute_deviation_ms: String(101 + index),
        is_qualified: false,
        is_exact_hit: false,
      })),
    ];
    const board = limitLeaderboard(buildLeaderboard(rows, Number.MAX_SAFE_INTEGER));

    expect(board.qualified).toHaveLength(60);
    expect(board.notQualified).toHaveLength(40);
    expect(board.qualified.length + board.notQualified.length).toBe(100);
  });

  it("shows each player once and selects their best attempt", () => {
    const result = buildLeaderboard([
      row({ attempt_id: "outside", is_qualified: false, is_exact_hit: false, elapsed_ms: "9900", deviation_ms: "-100", absolute_deviation_ms: "100" }),
      row({ attempt_id: "qualified", elapsed_ms: "9999", deviation_ms: "-1", absolute_deviation_ms: "1", is_exact_hit: false, created_at: "2026-10-25T12:01:00Z" }),
      row({ player_id: "player-2", nickname: "Lin", attempt_id: "near", elapsed_ms: "10005", deviation_ms: "5", absolute_deviation_ms: "5", is_exact_hit: false }),
    ]);
    expect(result.qualified.map((item) => item.player_id)).toEqual(["player-1", "player-2"]);
    expect(result.qualified[0]?.attempt_id).toBe("qualified");
    expect(result.notQualified).toEqual([]);
    expect(new Set([...result.qualified, ...result.notQualified].map((item) => item.player_id)).size).toBe(2);
  });

  it("orders qualified players by smallest absolute deviation, then earliest best attempt", () => {
    const ordered = sortLeaderboard([
      row({ player_id: "later", is_exact_hit: false, elapsed_ms: "10001", deviation_ms: "1", absolute_deviation_ms: "1", created_at: "2026-10-25T12:01:00Z" }),
      row({ player_id: "early", is_exact_hit: false, elapsed_ms: "9999", deviation_ms: "-1", absolute_deviation_ms: "1", created_at: "2026-10-25T12:00:00Z" }),
      row({ player_id: "nearest", is_exact_hit: false, elapsed_ms: "10000.5", deviation_ms: "0.5", absolute_deviation_ms: "0.5", created_at: "2026-10-25T12:02:00Z" }),
      row({ player_id: "exact", created_at: "2026-10-25T12:03:00Z" }),
    ]);
    expect(ordered.map((item) => item.player_id)).toEqual(["exact", "nearest", "early", "later"]);
  });

  it("places every non-qualified participant after qualified participants", () => {
    const ordered = sortLeaderboard([
      row({ player_id: "outside-nearest", is_qualified: false, is_exact_hit: false, elapsed_ms: "10101", deviation_ms: "101", absolute_deviation_ms: "101" }),
      row({ player_id: "outside-far", is_qualified: false, is_exact_hit: false, elapsed_ms: "11000", deviation_ms: "1000", absolute_deviation_ms: "1000" }),
      row({ player_id: "qualified", is_exact_hit: false, elapsed_ms: "10099", deviation_ms: "99", absolute_deviation_ms: "99" }),
    ]);
    expect(ordered.map((item) => item.player_id)).toEqual(["qualified", "outside-nearest", "outside-far"]);
  });

  it("does not show an unqualified attempt as a winner when nobody qualifies", () => {
    const result = buildLeaderboard([
      row({ is_qualified: false, is_exact_hit: false, elapsed_ms: "10101", deviation_ms: "101", absolute_deviation_ms: "101" }),
    ]);
    expect(result.qualified).toEqual([]);
    expect(result.notQualified).toHaveLength(1);
  });
});
