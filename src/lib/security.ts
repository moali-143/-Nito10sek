import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_LIFETIME_SECONDS = 15 * 60;

export function getGameTokenSecret(): string {
  const secret = process.env.GAME_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("Game token secret is not configured");
  return secret;
}

export function signGameToken(sessionId: string, playerId: string): string {
  const payload = Buffer.from(JSON.stringify({ sessionId, playerId, exp: Date.now() + SESSION_LIFETIME_SECONDS * 1000 })).toString("base64url");
  const signature = createHmac("sha256", getGameTokenSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyGameToken(token: unknown): { sessionId: string; playerId: string } | null {
  if (typeof token !== "string" || token.length > 1024) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const expected = createHmac("sha256", getGameTokenSecret()).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sessionId?: unknown;
      playerId?: unknown;
      exp?: unknown;
    };
    if (
      typeof data.sessionId !== "string" ||
      typeof data.playerId !== "string" ||
      typeof data.exp !== "number" ||
      Date.now() > data.exp
    ) return null;
    return { sessionId: data.sessionId, playerId: data.playerId };
  } catch {
    return null;
  }
}

export function rateLimitKey(request: Request): string {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 24) throw new Error("Rate limit secret is not configured");
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
