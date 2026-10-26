import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isConfigured: vi.fn(() => true),
  getAdminClient: vi.fn(),
  getAdminUser: vi.fn(),
  hasTrustedOrigin: vi.fn(() => false),
}));

vi.mock("@/lib/supabase/admin", () => ({
  isSupabaseConfigured: mocks.isConfigured,
  getAdminSupabase: mocks.getAdminClient,
}));

vi.mock("@/lib/api", () => ({
  getAdminUser: mocks.getAdminUser,
  hasTrustedOrigin: mocks.hasTrustedOrigin,
  jsonError: (message: string, status: number) => Response.json({ error: message }, { status }),
}));

vi.mock("@/lib/security", () => ({ isUuid: (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) }));

import { GET } from "@/app/api/admin/overview/route";
import { DELETE } from "@/app/api/admin/attempts/[id]/route";

describe("admin route access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isConfigured.mockReturnValue(true);
  });

  it("does not return the admin overview to an unauthenticated user", async () => {
    mocks.getAdminUser.mockResolvedValue(null);
    const response = await GET(new Request("https://example.test/api/admin/overview"));
    expect(response.status).toBe(403);
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("does not let an unauthenticated public user delete another player's attempt", async () => {
    mocks.getAdminUser.mockResolvedValue(null);
    const response = await DELETE(
      new Request("https://example.test/api/admin/attempts/123e4567-e89b-42d3-a456-426614174000", { method: "DELETE" }),
      { params: Promise.resolve({ id: "123e4567-e89b-42d3-a456-426614174000" }) },
    );
    expect(response.status).toBe(403);
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects cross-origin deletion even for an authenticated administrator", async () => {
    mocks.getAdminUser.mockResolvedValue({ id: "admin-id" });
    mocks.hasTrustedOrigin.mockReturnValue(false);
    const response = await DELETE(
      new Request("https://example.test/api/admin/attempts/123e4567-e89b-42d3-a456-426614174000", {
        method: "DELETE",
        headers: { Origin: "https://attacker.example" },
      }),
      { params: Promise.resolve({ id: "123e4567-e89b-42d3-a456-426614174000" }) },
    );
    expect(response.status).toBe(403);
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });
});
