import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    rpcMock: vi.fn(),
    dbRpcMock: vi.fn(),
  };
});

vi.mock("$/ServerApiClient", () => {
  return {
    createServerApiClient: () => {
      return { rpc: mocks.rpcMock };
    },
  };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { rpc: mocks.dbRpcMock };
      },
    },
  };
});

vi.mock("@/clients/AuthClient/AuthClient", () => {
  return { AuthClient: { getCurrentSession: vi.fn() } };
});

const { UserClient } = await import("@/clients/UserClient");

const PARAMS = {
  resourceType: "dataset",
  resourceId: "11111111-1111-4111-8111-111111111111",
  minRole: "admin",
} as const;

describe("UserClient.canAccessResource", () => {
  beforeEach(() => {
    mocks.rpcMock.mockReset();
    mocks.dbRpcMock.mockReset();
    mocks.rpcMock.mockResolvedValue(true);
  });

  it("asks the platform server API with the RPC's argument names", async () => {
    // Through `serverApi`, never the webview's own Supabase client: on
    // desktop that client holds no session, so its RPC runs as `anon`, which
    // may not execute this function.
    await UserClient.canAccessResource(PARAMS);

    expect(mocks.rpcMock).toHaveBeenCalledWith(
      "util__auth_user_can_access_resource",
      {
        p_resource_type: "dataset",
        p_resource_id: PARAMS.resourceId,
        p_min_role: "admin",
      },
    );
    expect(mocks.dbRpcMock).not.toHaveBeenCalled();
  });

  it("returns true when the server says the user has access", async () => {
    await expect(UserClient.canAccessResource(PARAMS)).resolves.toBe(true);
  });

  it("returns false when the server says the user has no access", async () => {
    mocks.rpcMock.mockResolvedValue(false);

    await expect(UserClient.canAccessResource(PARAMS)).resolves.toBe(false);
  });

  it("returns false when the server answers null", async () => {
    // The SQL helper answers null for a resource with no effective role.
    mocks.rpcMock.mockResolvedValue(null);

    await expect(UserClient.canAccessResource(PARAMS)).resolves.toBe(false);
  });

  it("lets an RPC failure propagate instead of reading it as no access", async () => {
    mocks.rpcMock.mockRejectedValue(new Error("rpc unavailable"));

    await expect(UserClient.canAccessResource(PARAMS)).rejects.toThrow(
      "rpc unavailable",
    );
  });
});
