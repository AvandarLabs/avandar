import { appForResource, appLabel, resourceTypeLabel } from "./shareCopy";
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
  shares: readonly ResourceShareRow[];
  isRestricted: boolean;
  workspaceShareRole: RoleLevel | null;
  resourceType: ResourceType;
  workspaceName: string;
  userById: Readonly<Record<string, string>>;
  groupById: Readonly<Record<string, string>>;
};

/**
 * Pure builder: turns the modal's current state into a list of summary
 * spans that the `ShareSummaryLine` component renders as a human-readable
 * sentence with inline pills. No React, no side effects.
 */
export function buildShareSummary(
  opts: BuildShareSummaryOptions,
): SummarySpan[] {
  const resource = resourceTypeLabel(opts.resourceType);
  const app = appLabel(appForResource(opts.resourceType));

  const userShares = opts.shares.filter((s) => {
    return s.principalType === "user" && s.principalId;
  });
  const groupShares = opts.shares.filter((s) => {
    return s.principalType === "user_group" && s.principalId;
  });

  const hasAnyShares = userShares.length + groupShares.length > 0;
  const hasWorkspaceShare = opts.workspaceShareRole !== null;

  if (!hasAnyShares && !hasWorkspaceShare) {
    return [
      {
        kind: "text",
        text: `This ${resource} is currently only accessible to its owner.`,
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
    const userFrag: SummarySpan[] = [];
    userShares.forEach((s, i) => {
      const name = opts.userById[s.principalId as string] ?? "Unknown user";
      if (i > 0) {
        userFrag.push({ kind: "text", text: ", " });
      }
      userFrag.push({ kind: "pill", label: name, variant: "user" });
    });
    fragments.push(userFrag);
  }

  groupShares.forEach((s) => {
    const groupName =
      opts.groupById[s.principalId as string] ?? "Unknown group";
    const frag: SummarySpan[] = [
      { kind: "text", text: "all members of " },
      { kind: "pill", label: groupName, variant: "group" },
    ];
    if (s.requiresAppAccess) {
      frag.push({ kind: "text", text: " who also have " });
      frag.push({ kind: "pill", label: app, variant: "app" });
      frag.push({ kind: "text", text: " access" });
    }
    fragments.push(frag);
  });

  if (hasWorkspaceShare && opts.workspaceShareRole) {
    const frag: SummarySpan[] = [
      { kind: "text", text: "anyone in " },
      { kind: "pill", label: opts.workspaceName, variant: "workspace" },
      { kind: "text", text: " with " },
      { kind: "pill", label: app, variant: "app" },
      { kind: "text", text: " access as " },
      {
        kind: "pill",
        label: _capitalize(opts.workspaceShareRole),
        variant: "role",
      },
    ];
    fragments.push(frag);
  }

  // Join fragments with commas; if there are 2+ fragments, the final
  // separator becomes ", and " (Oxford-style for readability).
  fragments.forEach((frag, i) => {
    if (i > 0) {
      const sep = i === fragments.length - 1 ? ", and " : ", ";
      spans.push({ kind: "text", text: sep });
    }
    spans.push(...frag);
  });

  spans.push({ kind: "text", text: "." });
  return spans;
}

function _capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
