import { describe, expect, it, vi } from "vitest";

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

const { PrivateResourceAdminClient } =
  await import("./PrivateResourceAdminClient");

describe("PrivateResourceAdminClient", () => {
  it("maps count rows to camelCase", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          user_id: "user-1",
          private_dashboard_count: 2,
          private_dataset_count: 5,
          private_map_count: 7,
        },
      ],
      error: null,
    });

    const result = await PrivateResourceAdminClient.getPrivateResourceCounts({
      workspaceId: "ws-1" as never,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      "rpc_workspaces__private_resource_counts",
      { p_workspace_id: "ws-1" },
    );
    expect(result).toEqual([
      {
        userId: "user-1",
        privateDashboardCount: 2,
        privateDatasetCount: 5,
        privateMapCount: 7,
      },
    ]);
  });

  it("throws the supabase error message on failure", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "insufficient_privilege" },
    });

    await expect(
      PrivateResourceAdminClient.getPrivateResourceCounts({
        workspaceId: "ws-1" as never,
      }),
    ).rejects.toThrow("insufficient_privilege");
  });

  it("passes transfer arguments through with p_ prefixes", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });

    await PrivateResourceAdminClient.transferResourceOwnership({
      resourceType: "dashboard",
      resourceId: "dash-1",
      newOwnerId: "user-2",
    });

    expect(rpcMock).toHaveBeenCalledWith("rpc_resources__transfer_ownership", {
      p_resource_type: "dashboard",
      p_resource_id: "dash-1",
      p_new_owner_id: "user-2",
    });
  });

  it("returns the moved count from a bulk transfer", async () => {
    rpcMock.mockResolvedValueOnce({ data: 3, error: null });

    const numMovedResources =
      await PrivateResourceAdminClient.transferAllOwnedResources({
        workspaceId: "ws-1" as never,
        fromUserId: "user-1",
        newOwnerId: "user-2",
      });

    expect(rpcMock).toHaveBeenCalledWith(
      "rpc_workspaces__transfer_all_owned_resources",
      {
        p_workspace_id: "ws-1",
        p_from_user_id: "user-1",
        p_new_owner_id: "user-2",
      },
    );
    expect(numMovedResources).toBe(3);
  });

  it("treats a null bulk-transfer result as zero moved", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });

    const numMovedResources =
      await PrivateResourceAdminClient.transferAllOwnedResources({
        workspaceId: "ws-1" as never,
        fromUserId: "user-1",
        newOwnerId: "user-2",
      });

    expect(numMovedResources).toBe(0);
  });
});
