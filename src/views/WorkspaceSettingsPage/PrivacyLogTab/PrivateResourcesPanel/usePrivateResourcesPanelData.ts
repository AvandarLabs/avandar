import type { Workspace } from "$/models/Workspace/Workspace";
import type { PrivateResourceCount } from "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient";

import { PrivateResourceAdminClient } from "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";

/** Loads fresh private-resource counts and matching member names. */
export function usePrivateResourcesPanelData(workspaceId: Workspace.Id): {
  privateResourceCounts: PrivateResourceCount[];
  isLoading: boolean;
  nameByUserId: Record<string, string>;
} {
  const [privateResourceCounts = [], , privateResourceCountsQuery] =
    PrivateResourceAdminClient.useGetPrivateResourceCounts({
      workspaceId,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const [members = [], isLoadingMembers] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const nameByUserId = Object.fromEntries(
    members.map((member): [string, string] => {
      return [member.userId, member.displayName || member.fullName];
    }),
  );

  return {
    privateResourceCounts,
    isLoading: privateResourceCountsQuery.isFetching || isLoadingMembers,
    nameByUserId,
  };
}
