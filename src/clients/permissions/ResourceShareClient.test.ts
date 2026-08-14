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

const rpcMock = vi.fn();

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { rpc: rpcMock };
      },
    },
  };
});

const { ResourceShareClient } = await import("./ResourceShareClient");

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
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("passes arguments through with p_ prefixes", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });

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
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "insufficient_privilege" },
    });

    await expect(
      ResourceShareClient.makeResourcePrivate({
        resourceType: "dataset",
        resourceId: "ds-1",
      }),
    ).rejects.toThrow("insufficient_privilege");
  });
});
