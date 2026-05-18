import { describe, expect, it, vi } from "vitest";
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

const { rpcMock } = vi.hoisted(() => {
  return {
    rpcMock: vi.fn(),
  };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return {
          rpc: rpcMock,
        };
      },
    },
  };
});

const { SharedWithMeClient } = await import("./SharedWithMeClient");

describe("SharedWithMeClient.listSharedWithMe", () => {
  it("maps RPC rows from snake_case to camelCase", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          resource_type: "dataset",
          resource_id: "ds-1",
          name: "Sales Q1",
          effective_role: "viewer",
        },
        {
          resource_type: "dashboard",
          resource_id: "dash-1",
          name: "Marketing",
          effective_role: "editor",
        },
      ],
      error: null,
    });

    const result = await SharedWithMeClient.listSharedWithMe({
      workspaceId: "ws-1" as WorkspaceId,
    });

    expect(rpcMock).toHaveBeenCalledWith("rpc__list_shared_with_me", {
      p_workspace_id: "ws-1",
    });
    expect(result).toEqual([
      {
        resourceType: "dataset",
        resourceId: "ds-1",
        name: "Sales Q1",
        effectiveRole: "viewer",
      },
      {
        resourceType: "dashboard",
        resourceId: "dash-1",
        name: "Marketing",
        effectiveRole: "editor",
      },
    ]);
  });

  it("returns an empty array when the RPC returns null data", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const result = await SharedWithMeClient.listSharedWithMe({
      workspaceId: "ws-1" as WorkspaceId,
    });
    expect(result).toEqual([]);
  });

  it("throws when the RPC returns an error", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });
    await expect(
      SharedWithMeClient.listSharedWithMe({
        workspaceId: "ws-1" as WorkspaceId,
      }),
    ).rejects.toThrow("boom");
  });
});
