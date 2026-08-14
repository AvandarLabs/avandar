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
  cancelLabel: string;
  privateOptionLabel: string;
  privateOptionTooltip: (resource: string) => string;
  privateOptionDisabledTooltip: (resource: string) => string;
  makePrivateConfirm: (options: {
    resourceName: string;
    numUsers: number;
    numGroups: number;
    losesWorkspaceAccess: boolean;
    app: string;
  }) => { title: string; body: string; confirmLabel: string };
  limitToAppAccessTooltip: (app: string) => string;
  roleSelectTooltip: string;
  removeTooltip: (name: string) => string;
  ownerBadgeTooltip: (resource: string) => string;
  peopleWithAccessHeading: string;
  generalAccessHeading: string;
  emptyState: {
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
    cancelLabel: t`Cancel`,
    privateOptionLabel: t`Only me`,
    privateOptionTooltip: (resource: string): string => {
      return t`Only you can access this ${resource}. Everyone else loses access, including workspace admins.`;
    },
    privateOptionDisabledTooltip: (resource: string): string => {
      return t`Only the owner can make this ${resource} private.`;
    },
    makePrivateConfirm: ({
      resourceName,
      numUsers,
      numGroups,
      losesWorkspaceAccess,
      app,
    }): { title: string; body: string; confirmLabel: string } => {
      // Both count branches are written out with `t` instead of Lingui's
      // `plural` macro, which binds to a different i18n instance than the
      // runtime `t` returned by `useLingui()`.
      const peopleClause =
        numUsers === 0 ? ""
        : numUsers === 1 ? t`1 person`
        : t`${numUsers} people`;
      const groupClause =
        numGroups === 0 ? ""
        : numGroups === 1 ? t`1 group`
        : t`${numGroups} groups`;
      const shareClause =
        peopleClause && groupClause ?
          t`${peopleClause} and ${groupClause}`
        : peopleClause || groupClause;

      const sentences = [
        shareClause ? t`${shareClause} will lose access.` : "",
        losesWorkspaceAccess ? t`Everyone in ${app} will lose access.` : "",
        t`Only you will be able to open it. You can share it again at any time.`,
      ].filter(Boolean);

      return {
        title: t`Make "${resourceName}" private?`,
        body: sentences.join(" "),
        confirmLabel: t`Make private`,
      };
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
      noMembersOrTags: t`No members or user groups yet. Invite members or create user groups in Workspace settings.`,
    },
    noMatches: t`No matches`,
  };
}
