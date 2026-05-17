import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { AppType } from "$/models/Permissions/Permissions.types";

/**
 * Returns the human-readable label for a resource type. Used in headings,
 * tooltip copy, and the summary line ("dataset" / "dashboard").
 */
export function resourceTypeLabel(type: ResourceType): string {
  return type === "dashboard" ? "dashboard" : "dataset";
}

/**
 * Returns the human-readable app label used in General-access copy and the
 * "Limit to app access" tooltip ("Data Sources", "Dashboards", …).
 */
export function appLabel(app: AppType): string {
  switch (app) {
    case "data_sources":
      return "Data Sources";
    case "dashboards":
      return "Dashboards";
    case "data_explorer":
      return "Data Explorer";
    case "settings":
      return "Settings";
  }
}

/**
 * Maps a `ResourceType` to the workspace app that owns it. Datasets live
 * under `data_sources`; dashboards live under `dashboards`.
 */
export function appForResource(type: ResourceType): AppType {
  return type === "dashboard" ? "dashboards" : "data_sources";
}

/**
 * Centralized user-visible strings for the share modal. Anything that
 * shows up in the UI as text or a tooltip should live here so copy/docs
 * reviews only need to touch one file.
 */
export const SHARE_COPY = {
  addPlaceholder: "Search by name or tag",
  addHelper:
    "Add a member or a tag to grant access. Use General access below to share more broadly.",
  generalAccessHelper:
    "Controls the default for the rest of the workspace. People without app access still need a direct share above.",
  restrictedOptionTooltip: (resource: string): string => {
    return `Only the people and groups listed above can access this ${resource}.`;
  },
  workspaceOptionTooltip: (resource: string, app: string): string => {
    return `Every workspace member who can open the ${app} app gets this role on this ${resource}, in addition to whatever's listed above.`;
  },
  limitToAppAccessTooltip: (app: string): string => {
    return `When on, members of this group only get access if they already have ${app} access in the workspace. When off, every member of the group gets access here, even if they normally can't open ${app}.`;
  },
  roleSelectTooltip:
    "What this person or group can do. Viewer = read only, Editor = edit content, Admin = full control including sharing.",
  removeTooltip: (name: string): string => {
    return `Remove access for ${name}.`;
  },
  ownerBadgeTooltip: (resource: string): string => {
    return `The owner always has admin access. To change owner, use the ${resource} settings.`;
  },
  peopleWithAccessHeading: "People with access",
  generalAccessHeading: "General access",
  emptyState: {
    noShares: (resource: string): string => {
      return `This ${resource} is currently only accessible to its owner.`;
    },
    noMembersOrTags:
      "No members or tags yet. Invite members or create tags in Workspace settings.",
  },
} as const;
