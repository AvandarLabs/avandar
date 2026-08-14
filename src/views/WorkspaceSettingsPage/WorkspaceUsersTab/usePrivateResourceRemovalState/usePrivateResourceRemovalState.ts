import { PrivateResourceAdminClient } from "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Loads fresh private-resource counts that guard member removal. */
export function usePrivateResourceRemovalState(workspaceId: Workspace.Id): {
  isFetchingPrivateCounts: boolean;
  privateResourceTotalByUserId: Record<string, number>;
} {
  const [privateResourceCounts = [], , privateResourceCountsQuery] =
    PrivateResourceAdminClient.useGetPrivateResourceCounts({
      workspaceId,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const privateResourceTotalByUserId = Object.fromEntries(
    privateResourceCounts.map((privateResourceCount): [string, number] => {
      return [
        privateResourceCount.userId,
        privateResourceCount.privateDashboardCount +
          privateResourceCount.privateDatasetCount,
      ];
    }),
  );

  return {
    isFetchingPrivateCounts: privateResourceCountsQuery.isFetching,
    privateResourceTotalByUserId,
  };
}
