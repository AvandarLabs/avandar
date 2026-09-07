import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";
import type { DisplayShare } from "../SharePrincipalList";
import type { ResourceShareMutations } from "./useResourceShareMutations";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";

/** What the "add a person or group" row emits when it is committed. */
export type AddPrincipalSelection = {
  principalType: "user" | "user_group";
  principalId: string;
  role: RoleLevel;
};

export type ShareRowCallbacks = {
  onAddPrincipal: (selection: AddPrincipalSelection) => void;
  onRoleChange: (share: DisplayShare, role: RoleLevel) => void;
  onToggleRequiresAppAccess: (share: DisplayShare, next: boolean) => void;
  onRemoveShare: (share: DisplayShare) => void;
};

/**
 * The four things a viewer can do to the principal list, each closed over the
 * resource they act on so the components below never restate it.
 *
 * Every one of them ignores the Owner row. That row is synthesised from the
 * resource's `owner_id` rather than read from `resource_shares`, so there is
 * no row to write back to; the UI renders it read-only and these guards are
 * the second line of that same rule.
 */
export function makeShareRowCallbacks(
  options: Readonly<{
    workspaceId: WorkspaceId;
    resourceType: ResourceType;
    resourceId: string;
    mutations: ResourceShareMutations;
  }>,
): ShareRowCallbacks {
  const { workspaceId, resourceType, resourceId, mutations } = options;
  const resource = { workspaceId, resourceType, resourceId };

  return {
    onAddPrincipal: ({ principalType, principalId, role }) => {
      mutations.upsertShare({
        ...resource,
        principalType,
        principalId,
        role,
        requiresAppAccess: false,
      });
    },

    onRoleChange: (share, role) => {
      if (share.isOwnerRow) {
        return;
      }
      mutations.upsertShare({
        ...resource,
        principalType: share.principalType,
        principalId: share.principalId,
        role,
        requiresAppAccess: share.requiresAppAccess,
      });
    },

    onToggleRequiresAppAccess: (share, next) => {
      // Only a group share can require app access: a user either has the app
      // or does not, with no per-share answer to give.
      if (share.isOwnerRow || share.principalType !== "user_group") {
        return;
      }
      mutations.upsertShare({
        ...resource,
        principalType: share.principalType,
        principalId: share.principalId,
        role: share.role,
        requiresAppAccess: next,
      });
    },

    onRemoveShare: (share) => {
      if (share.isOwnerRow) {
        return;
      }
      mutations.deleteShare({ shareId: share.id });
    },
  };
}
