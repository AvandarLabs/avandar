import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

vi.mock("$/env/getSupabaseApiUrl.ts", () => {
  return {
    getSupabaseApiUrl: () => {
      return "http://test.local";
    },
  };
});

vi.mock("$/env/getSupabaseApiKey.ts", () => {
  return {
    getSupabaseApiKey: () => {
      return "test-anon-key";
    },
  };
});

const { fromMock, rpcMock, throwOnErrorMock } = vi.hoisted(() => {
  return {
    fromMock: vi.fn(),
    rpcMock: vi.fn(),
    throwOnErrorMock: vi.fn(),
  };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: fromMock, rpc: rpcMock };
      },
    },
  };
});

const { ResourceShareClient } = await import("./ResourceShareClient");

function _createQuery(result: unknown) {
  const query = {
    select: vi.fn(() => {
      return query;
    }),
    eq: vi.fn(() => {
      return query;
    }),
    is: vi.fn(() => {
      return query;
    }),
    update: vi.fn(() => {
      return query;
    }),
    single: vi.fn(() => {
      return query;
    }),
    throwOnError: vi.fn(() => {
      return Promise.resolve(result);
    }),
  };
  return query;
}

beforeEach(() => {
  fromMock.mockReset();
  rpcMock.mockReset();
  throwOnErrorMock.mockReset();
  rpcMock.mockReturnValue({ throwOnError: throwOnErrorMock });
});

describe("ResourceShareClient.upsertResourceShare", () => {
  it("rejects requiresAppAccess=true for non-group shares", async () => {
    await expect(
      ResourceShareClient.upsertResourceShare({
        workspaceId: "ws-1" as WorkspaceId,
        resourceType: "dataset",
        resourceId: "ds-1",
        principalType: "user",
        principalId: "u-1",
        role: "viewer",
        requiresAppAccess: true,
      }),
    ).rejects.toThrow(/requiresAppAccess applies only to user_group/);
  });

  it("rejects requiresAppAccess=true for workspace shares", async () => {
    await expect(
      ResourceShareClient.upsertResourceShare({
        workspaceId: "ws-1" as WorkspaceId,
        resourceType: "dataset",
        resourceId: "ds-1",
        principalType: "workspace",
        principalId: null,
        role: "viewer",
        requiresAppAccess: true,
      }),
    ).rejects.toThrow(/requiresAppAccess applies only to user_group/);
  });
});

describe("ResourceShareClient.makeResourcePrivate", () => {
  it("passes arguments through with p_ prefixes", async () => {
    throwOnErrorMock.mockResolvedValueOnce({ data: null, error: null });

    await ResourceShareClient.makeResourcePrivate({
      resourceType: "dashboard",
      resourceId: "dash-1",
    });

    expect(rpcMock).toHaveBeenCalledWith("rpc_resources__make_private", {
      p_resource_type: "dashboard",
      p_resource_id: "dash-1",
    });
  });

  it("throws the supabase error message on failure", async () => {
    throwOnErrorMock.mockRejectedValueOnce(new Error("insufficient_privilege"));

    await expect(
      ResourceShareClient.makeResourcePrivate({
        resourceType: "dataset",
        resourceId: "ds-1",
      }),
    ).rejects.toThrow("insufficient_privilege");
  });
});

describe("ResourceShareClient map routing", () => {
  it("reads map restriction state from the maps table", async () => {
    const mapQuery = _createQuery({
      data: { is_restricted: true, owner_id: "owner-1" },
    });
    const sharesQuery = _createQuery({ data: [] });
    fromMock.mockImplementation((tableName: string) => {
      return tableName === "maps" ? mapQuery : sharesQuery;
    });

    await expect(
      ResourceShareClient.getResourceSharingState({
        workspaceId: "ws-1" as WorkspaceId,
        resourceType: "map",
        resourceId: "map-1",
      }),
    ).resolves.toMatchObject({ isRestricted: true, ownerId: "owner-1" });

    expect(fromMock).toHaveBeenCalledWith("maps");
    expect(fromMock).not.toHaveBeenCalledWith("datasets");
  });

  it("updates map restriction state in the maps table", async () => {
    const mapQuery = _createQuery({ data: null, error: null });
    fromMock.mockReturnValue(mapQuery);

    await ResourceShareClient.setResourceRestricted({
      workspaceId: "ws-1" as WorkspaceId,
      resourceType: "map",
      resourceId: "map-1",
      isRestricted: false,
    });

    expect(fromMock).toHaveBeenCalledWith("maps");
    expect(fromMock).not.toHaveBeenCalledWith("datasets");
    expect(mapQuery.update).toHaveBeenCalledWith({ is_restricted: false });
  });
});
