import { QueryKey } from "@tanstack/react-query";
import { UserClient } from "@/clients/UserClient";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

/**
 * React Query keys for workspace permission reads.
 */
export const permissionsQueryKeys = {
  userAppRoles: (workspaceId: string, userId: string): QueryKey => {
    return UserClient.QueryKeys.getUserAppRoles({
      workspaceId: workspaceId as WorkspaceId,
      userId: userId as UserId,
    });
  },

  /**
   * @param resourceType Dashboard or dataset.
   * @param resourceId Resource primary key.
   */
  resourceEffectiveRole: (
    resourceType: string,
    resourceId: string,
  ): readonly string[] => {
    return ["ResourceEffectiveRole", resourceType, resourceId];
  },
};
