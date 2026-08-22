import type { Workspace } from "$/models/Workspace/Workspace";

import { describe, expect, it, vi } from "vitest";

import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { renderHook } from "@/test-utils";

const useGetPrivateResourceCounts = vi.fn();

vi.mock(
  "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient",
  () => {
    return {
      PrivateResourceAdminClient: {
        useGetPrivateResourceCounts,
      },
    };
  },
);

const { usePrivateResourceRemovalState } =
  await import("./usePrivateResourceRemovalState");

describe("usePrivateResourceRemovalState", () => {
  it("blocks removal while fresh private-resource counts are fetching", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        {
          userId: "user-1",
          privateDashboardCount: 2,
          privateDatasetCount: 3,
          privateMapCount: 0,
        },
      ],
      false,
      { isFetching: true },
    ]);

    const { result } = renderHook(() => {
      return usePrivateResourceRemovalState("workspace-1" as Workspace.Id);
    });

    expect(useGetPrivateResourceCounts).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
    expect(result.current).toEqual({
      isFetchingPrivateCounts: true,
      privateResourceTotalByUserId: { "user-1": 5 },
    });
  });

  it("blocks removal when the member only owns private maps", () => {
    useGetPrivateResourceCounts.mockReturnValue([
      [
        {
          userId: "user-1",
          privateDashboardCount: 0,
          privateDatasetCount: 0,
          privateMapCount: 1,
        },
      ],
      false,
      { isFetching: false },
    ]);

    const { result } = renderHook(() => {
      return usePrivateResourceRemovalState("workspace-1" as Workspace.Id);
    });

    expect(result.current.privateResourceTotalByUserId).toEqual({
      "user-1": 1,
    });
  });
});
