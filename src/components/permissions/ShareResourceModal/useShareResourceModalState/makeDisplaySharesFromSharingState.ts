import type { WorkspaceMemberProfile } from "$/models/User/UserProfile.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";
import type { DisplayShare } from "../SharePrincipalList";
import type {
  ResourceShareRow,
  ResourceSharingState,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { I18n } from "@lingui/core";

import { propEq } from "@avandar/utils";
import { msg } from "@lingui/core/macro";

import { hasPrincipalId } from "../buildShareSummary/buildShareSummary";

/**
 * Resolves the display name for the resource owner from the available
 * lookup tables. Fallback chain: `userById[ownerId]` (preferred display
 * name), then the member's `email` from the workspace members list,
 * finally "Unknown user" (the same last resort the other principal rows use)
 * when the owner has no readable profile. That last resort must not read
 * "Owner": the row already carries an Owner badge, so the two would render
 * as a confusing "Owner Owner" pair.
 */
function _getOwnerDisplayName(
  options: Readonly<{
    ownerId: string;
    members: WorkspaceMemberProfile[] | undefined;
    userById: Readonly<Record<string, string>>;
    i18n: I18n;
  }>,
): string {
  const { ownerId, members, userById, i18n } = options;
  return (
    userById[ownerId] ??
    members?.find((member) => {
      return member.userId === ownerId;
    })?.email ??
    i18n._(msg`Unknown user`)
  );
}

/**
 * The rows the principal list renders: owner first, then users, then groups,
 * each group alphabetical by display name.
 *
 * The Owner row is built in memory rather than read from `resource_shares`:
 * the owner is the resource row's `owner_id`, so we never write back through
 * this entry, and the UI renders it read-only.
 *
 * Takes `i18n` and resolves `msg` descriptors rather than a `t` from
 * `useLingui()`: a translate function threaded in as a parameter is a runtime
 * value the extractor cannot follow, so those strings would never reach the
 * catalogs.
 *
 * @param options.directShares Shares already stripped of the workspace-wide
 *   row and of any row naming the owner, which the Owner row shadows.
 */
export function makeDisplaySharesFromSharingState(
  options: Readonly<{
    sharingState: ResourceSharingState;
    resourceType: ResourceType;
    resourceId: string;
    workspaceId: WorkspaceId;
    directShares: readonly ResourceShareRow[];
    userById: Readonly<Record<string, string>>;
    groupById: Readonly<Record<string, string>>;
    members: WorkspaceMemberProfile[] | undefined;
    i18n: I18n;
  }>,
): DisplayShare[] {
  const {
    sharingState,
    resourceType,
    resourceId,
    workspaceId,
    directShares,
    userById,
    groupById,
    members,
    i18n,
  } = options;

  const ownerShare: DisplayShare = {
    id: `__owner__:${sharingState.ownerId}`,
    workspaceId,
    resourceType,
    resourceId,
    principalType: "user",
    principalId: sharingState.ownerId,
    role: "admin",
    requiresAppAccess: false,
    displayName: _getOwnerDisplayName({
      ownerId: sharingState.ownerId,
      members,
      userById,
      i18n,
    }),
    isOwnerRow: true,
  };

  const byDisplayName = (a: DisplayShare, b: DisplayShare): number => {
    return a.displayName.localeCompare(b.displayName);
  };

  const userShares = directShares
    .filter(hasPrincipalId)
    .filter(propEq("principalType", "user"))
    .map((share): DisplayShare => {
      return {
        ...share,
        displayName: userById[share.principalId] ?? i18n._(msg`Unknown user`),
      };
    })
    .sort(byDisplayName);

  const groupShares = directShares
    .filter(hasPrincipalId)
    .filter(propEq("principalType", "user_group"))
    .map((share): DisplayShare => {
      return {
        ...share,
        displayName: groupById[share.principalId] ?? i18n._(msg`Unknown group`),
      };
    })
    .sort(byDisplayName);

  return [ownerShare, ...userShares, ...groupShares];
}
