import { capitalize, propEq } from "@utils";
import {
  SHARE_COPY,
  appForResource,
  appLabel,
  resourceTypeLabel,
} from "../shareCopy";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

/**
 * One run in the rendered summary line: a literal text segment or a labelled
 * pill. Pills are rendered as Mantine badges; text segments render verbatim.
 */
export type SummarySpan =
  | { kind: "text"; text: string }
  | {
      kind: "pill";
      label: string;
      variant: "user" | "group" | "workspace" | "app" | "role";
    };

type BuildShareSummaryOptions = {
  shares: ResourceShareRow[];
  isRestricted: boolean;
  workspaceShareRole: RoleLevel | null;
  resourceType: ResourceType;
  workspaceName: string;
  userById: Record<string, string>;
  groupById: Record<string, string>;
};

/**
 * Type guard that narrows a `ResourceShareRow` to one whose `principalId`
 * is a non-null string. Use this in `.filter(hasPrincipalId)` so callers
 * can read `share.principalId` as `string` without a cast.
 */
export function hasPrincipalId(
  share: ResourceShareRow,
): share is ResourceShareRow & { principalId: string } {
  return share.principalId !== null;
}

/**
 * Pure builder: turns the modal's current state into a list of summary
 * spans that the `ShareSummaryLine` component renders as a human-readable
 * sentence with inline pills. No React, no side effects.
 */
export function buildShareSummary(
  opts: Readonly<BuildShareSummaryOptions>,
): SummarySpan[] {
  const resource = resourceTypeLabel(opts.resourceType);
  const app = appLabel(appForResource(opts.resourceType));

  const userShares = opts.shares
    .filter(hasPrincipalId)
    .filter(propEq("principalType", "user"));
  const groupShares = opts.shares
    .filter(hasPrincipalId)
    .filter(propEq("principalType", "user_group"));

  const hasAnyShares = userShares.length + groupShares.length > 0;
  const generalAccessRole = opts.workspaceShareRole ?? "viewer";

  if (!hasAnyShares) {
    if (!opts.isRestricted) {
      return buildGeneralAccessOnlySummary(resource, app, generalAccessRole);
    }

    return [
      {
        kind: "text",
        text: SHARE_COPY.emptyState.noShares(resource),
      },
    ];
  }

  const spans: SummarySpan[] = [
    { kind: "text", text: `This ${resource} is shared with: ` },
  ];

  const fragments: SummarySpan[][] = [];

  // Combine user shares into a single comma-joined fragment so the
  // sentence reads as one "list" item separated from group shares.
  if (userShares.length > 0) {
    const userFragment: SummarySpan[] = [];
    userShares.forEach((share, idx) => {
      const name = opts.userById[share.principalId] ?? "Unknown user";
      if (idx > 0) {
        userFragment.push({ kind: "text", text: ", " });
      }
      userFragment.push({ kind: "pill", label: name, variant: "user" });
    });
    fragments.push(userFragment);
  }

  groupShares.forEach((share) => {
    const groupName = opts.groupById[share.principalId] ?? "Unknown group";
    const fragment: SummarySpan[] = [
      { kind: "text", text: "all members of " },
      { kind: "pill", label: groupName, variant: "group" },
    ];
    if (share.requiresAppAccess) {
      fragment.push({ kind: "text", text: " who also have " });
      fragment.push({ kind: "pill", label: app, variant: "app" });
      fragment.push({ kind: "text", text: " access" });
    }
    fragments.push(fragment);
  });

  if (!opts.isRestricted) {
    fragments.push(buildGeneralAccessFragment(app, generalAccessRole));
  }

  // Join fragments with commas; if there are 2+ fragments, the final
  // separator becomes ", and " (Oxford-style for readability).
  fragments.forEach((fragment, idx) => {
    if (idx > 0) {
      const separator = idx === fragments.length - 1 ? ", and " : ", ";
      spans.push({ kind: "text", text: separator });
    }
    spans.push(...fragment);
  });

  spans.push({ kind: "text", text: "." });
  return spans;
}

function buildGeneralAccessOnlySummary(
  resource: string,
  app: string,
  role: RoleLevel,
): SummarySpan[] {
  return [
    {
      kind: "text",
      text: `This ${resource} is accessible to anyone with ${app} ${capitalize(role)} permission.`,
    },
  ];
}

function buildGeneralAccessFragment(
  app: string,
  role: RoleLevel,
): SummarySpan[] {
  return [
    { kind: "text", text: "anyone with " },
    { kind: "pill", label: app, variant: "app" },
    { kind: "text", text: " " },
    { kind: "pill", label: capitalize(role), variant: "role" },
    { kind: "text", text: " permission" },
  ];
}
