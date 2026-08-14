import { capitalize, propEq } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import { appLabel } from "$/copy/appLabel";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel";
import { appForResource } from "../shareCopy";
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
  const hasGeneralAccess =
    !opts.isRestricted || opts.workspaceShareRole !== null;
  const generalAccessRole = opts.workspaceShareRole ?? "viewer";

  if (!hasAnyShares) {
    if (hasGeneralAccess) {
      return buildGeneralAccessOnlySummary(resource, app, generalAccessRole);
    }
    return [
      {
        kind: "text",
        text: t`Only you have access to this ${resource}.`,
      },
    ];
  }

  // Combine user shares into a single comma-joined fragment so the
  // sentence reads as one "list" item separated from group shares.
  const userFragment = userShares.flatMap((share, shareIndex) => {
    const name = opts.userById[share.principalId] ?? t`Unknown user`;
    return [
      ...(shareIndex > 0 ? [{ kind: "text" as const, text: ", " }] : []),
      { kind: "pill" as const, label: name, variant: "user" as const },
    ];
  });

  const groupFragments = groupShares.map((share): SummarySpan[] => {
    const groupName = opts.groupById[share.principalId] ?? t`Unknown group`;
    return [
      { kind: "text", text: t`all members of ` },
      { kind: "pill", label: groupName, variant: "group" },
      ...(share.requiresAppAccess ?
        [
          { kind: "text" as const, text: t` who also have ` },
          { kind: "pill" as const, label: app, variant: "app" as const },
          { kind: "text" as const, text: t` access` },
        ]
      : []),
    ];
  });

  const fragments = [
    ...(userFragment.length > 0 ? [userFragment] : []),
    ...groupFragments,
    ...(hasGeneralAccess ?
      [buildGeneralAccessFragment(app, generalAccessRole)]
    : []),
  ];

  // Join fragments with commas; if there are 2+ fragments, the final
  // separator becomes ", and " (Oxford-style for readability).
  const joinedFragments = fragments.flatMap((fragment, fragmentIndex) => {
    const separator =
      fragmentIndex === 0 ? undefined
      : fragmentIndex === fragments.length - 1 ? t`, and `
      : ", ";
    return [
      ...(separator ? [{ kind: "text" as const, text: separator }] : []),
      ...fragment,
    ];
  });

  return [
    { kind: "text", text: t`This ${resource} is shared with: ` },
    ...joinedFragments,
    { kind: "text", text: "." },
  ];
}

function buildGeneralAccessOnlySummary(
  resource: string,
  app: string,
  role: RoleLevel,
): SummarySpan[] {
  return [
    {
      kind: "text",
      text: t`This ${resource} is accessible to anyone with ${app} ${capitalize(role)} permission.`,
    },
  ];
}

function buildGeneralAccessFragment(
  app: string,
  role: RoleLevel,
): SummarySpan[] {
  return [
    { kind: "text", text: t`anyone with ` },
    { kind: "pill", label: app, variant: "app" },
    { kind: "text", text: " " },
    { kind: "pill", label: capitalize(role), variant: "role" },
    { kind: "text", text: t` permission` },
  ];
}
