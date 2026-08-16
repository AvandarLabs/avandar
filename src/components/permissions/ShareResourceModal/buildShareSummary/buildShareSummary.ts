import { capitalize, propEq } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import { appLabel } from "$/copy/appLabel";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel";
import { appForResource } from "../copy/appForResource";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
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

/** A share row already narrowed to one that names a principal. */
type IdentifiedShare = ResourceShareRow & { principalId: string };

type BuildShareSummaryOptions = {
  shares: ResourceShareRow[];
  isRestricted: boolean;
  workspaceShareRole: RoleLevel | null;
  resourceType: ResourceType;
  workspaceName: string;
  userById: Record<string, string>;
  groupById: Record<string, string>;
  /**
   * Publication state, for resource types that have one. `undefined` means the
   * resource has no published form at all, which is every type except
   * dashboards today, and produces no publication span.
   */
  publication?: Dashboard.Visibility;
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
 * The sentence for a resource nobody holds a direct share on: either the
 * general-access rule covers everyone, or the owner is alone on it.
 */
function _makeNoDirectSharesSpans(
  options: Readonly<{
    resource: string;
    app: string;
    hasGeneralAccess: boolean;
    generalAccessRole: RoleLevel;
  }>,
): SummarySpan[] {
  const { resource, app, hasGeneralAccess, generalAccessRole } = options;
  if (hasGeneralAccess) {
    return buildGeneralAccessOnlySummary(resource, app, generalAccessRole);
  }
  return [{ kind: "text", text: t`Only you have access to this ${resource}.` }];
}

/**
 * Every named user as one comma-joined fragment, so the sentence reads as a
 * single "list" item separated from the group fragments beside it.
 */
function _makeUserFragment(
  options: Readonly<{
    userShares: readonly IdentifiedShare[];
    userById: Record<string, string>;
  }>,
): SummarySpan[] {
  const { userShares, userById } = options;
  return userShares.flatMap((share, shareIndex) => {
    const name = userById[share.principalId] ?? t`Unknown user`;
    return [
      ...(shareIndex > 0 ? [{ kind: "text" as const, text: ", " }] : []),
      { kind: "pill" as const, label: name, variant: "user" as const },
    ];
  });
}

/** One fragment per shared group, each its own item in the sentence. */
function _makeGroupFragments(
  options: Readonly<{
    groupShares: readonly IdentifiedShare[];
    groupById: Record<string, string>;
    app: string;
  }>,
): SummarySpan[][] {
  const { groupShares, groupById, app } = options;
  return groupShares.map((share): SummarySpan[] => {
    const groupName = groupById[share.principalId] ?? t`Unknown group`;
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
}

/**
 * Fragments joined with commas. With two or more, the final separator becomes
 * ", and " (Oxford-style for readability).
 */
function _makeJoinedFragmentSpans(
  fragments: readonly SummarySpan[][],
): SummarySpan[] {
  return fragments.flatMap((fragment, fragmentIndex) => {
    const separator =
      fragmentIndex === 0 ? undefined
      : fragmentIndex === fragments.length - 1 ? t`, and `
      : ", ";
    return [
      ...(separator ? [{ kind: "text" as const, text: separator }] : []),
      ...fragment,
    ];
  });
}

/** The sentence listing every direct share, then the general-access rule. */
function _makeSharedWithSpans(
  options: Readonly<{
    resource: string;
    app: string;
    userShares: readonly IdentifiedShare[];
    groupShares: readonly IdentifiedShare[];
    userById: Record<string, string>;
    groupById: Record<string, string>;
    hasGeneralAccess: boolean;
    generalAccessRole: RoleLevel;
  }>,
): SummarySpan[] {
  const { resource, app, hasGeneralAccess, generalAccessRole } = options;

  const userFragment = _makeUserFragment({
    userShares: options.userShares,
    userById: options.userById,
  });

  const fragments = [
    ...(userFragment.length > 0 ? [userFragment] : []),
    ..._makeGroupFragments({
      groupShares: options.groupShares,
      groupById: options.groupById,
      app,
    }),
    ...(hasGeneralAccess ?
      [buildGeneralAccessFragment(app, generalAccessRole)]
    : []),
  ];

  return [
    { kind: "text", text: t`This ${resource} is shared with: ` },
    ..._makeJoinedFragmentSpans(fragments),
    { kind: "text", text: "." },
  ];
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

  const hasGeneralAccess =
    !opts.isRestricted || opts.workspaceShareRole !== null;
  const generalAccessRole = opts.workspaceShareRole ?? "viewer";

  const accessSpans =
    userShares.length + groupShares.length === 0 ?
      _makeNoDirectSharesSpans({
        resource,
        app,
        hasGeneralAccess,
        generalAccessRole,
      })
    : _makeSharedWithSpans({
        resource,
        app,
        userShares,
        groupShares,
        userById: opts.userById,
        groupById: opts.groupById,
        hasGeneralAccess,
        generalAccessRole,
      });

  return [
    ...accessSpans,
    ...(opts.publication ?
      _buildPublicationSpans({
        publication: opts.publication,
        workspaceName: opts.workspaceName,
      })
    : []),
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

/**
 * The publication sentence appended to every summary for a resource that can
 * be published.
 *
 * The public case carries the warning deliberately: while a dashboard is
 * public, the people list below governs who can EDIT it, not who can read it.
 * That is the one place the two axes of this modal stop being independent, and
 * it is worth a sentence rather than a footnote.
 */
function _buildPublicationSpans(
  options: Readonly<{
    publication: Dashboard.Visibility;
    workspaceName: string;
  }>,
): SummarySpan[] {
  const { publication, workspaceName } = options;
  if (publication === "draft") {
    return [{ kind: "text", text: t` Not published yet.` }];
  }
  if (publication === "workspace") {
    return [
      { kind: "text", text: t` Published to ` },
      { kind: "pill", label: workspaceName, variant: "workspace" },
      { kind: "text", text: "." },
    ];
  }
  return [
    {
      kind: "text",
      text: t` Published on the web: anyone with the link can view it, and the list above controls editing only.`,
    },
  ];
}
