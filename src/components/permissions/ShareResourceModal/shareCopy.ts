import { useLingui } from "@lingui/react/macro";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { AppType } from "$/models/Permissions/Permissions.types";

/**
 * Maps a `ResourceType` to the workspace app that owns it. Datasets live
 * under `data_sources`; dashboards live under `dashboards`.
 */
export function appForResource(type: ResourceType): AppType {
  return type === "dashboard" ? "dashboards" : "data_sources";
}

export type ShareCopy = {
  addPlaceholder: string;
  addHelper: string;
  generalAccessHelper: string;
  restrictedOptionTooltip: (resource: string) => string;
  workspaceOptionTooltip: (resource: string, app: string) => string;
  limitToAppAccessTooltip: (app: string) => string;
  roleSelectTooltip: string;
  removeTooltip: (name: string) => string;
  ownerBadgeTooltip: (resource: string) => string;
  peopleWithAccessHeading: string;
  generalAccessHeading: string;
  emptyState: {
    noShares: (resource: string) => string;
    noMembersOrTags: string;
  };
  noMatches: string;
};

/**
 * Centralized user-visible strings for the share modal. Returns a fresh
 * `ShareCopy` whose strings are localized via Lingui at call time.
 */
export function useShareCopy(): ShareCopy {
   
  const { t } = useLingui();
  return {
    addPlaceholder: t`Search by name or user group`,
    addHelper: t`Add a member or a user group to grant access. Use General access below to share more broadly.`,
    generalAccessHelper: t`Controls the default for the rest of the workspace. People without app access still need a direct share above.`,
    restrictedOptionTooltip: (resource: string): string => {
      return t`Only the people and groups listed above can access this ${resource}.`;
    },
    workspaceOptionTooltip: (resource: string, app: string): string => {
      return t`Every workspace member who can open the ${app} app gets this role on this ${resource}, in addition to whatever's listed above.`;
    },
    limitToAppAccessTooltip: (app: string): string => {
      return t`When on, members of this group only get access if they already have ${app} access in the workspace. When off, every member of the group gets access here, even if they normally can't open ${app}.`;
    },
    roleSelectTooltip: t`What this person or group can do. Viewer = read only, Editor = edit content, Admin = full control including sharing.`,
    removeTooltip: (name: string): string => {
      return t`Remove access for ${name}.`;
    },
    ownerBadgeTooltip: (resource: string): string => {
      return t`The owner always has admin access. To change owner, use the ${resource} settings.`;
    },
    peopleWithAccessHeading: t`People with access`,
    generalAccessHeading: t`General access`,
    emptyState: {
      noShares: (resource: string): string => {
        return t`This ${resource} is currently only accessible to its owner.`;
      },
      noMembersOrTags: t`No members or user groups yet. Invite members or create user groups in Workspace settings.`,
    },
    noMatches: t`No matches`,
  };
}
