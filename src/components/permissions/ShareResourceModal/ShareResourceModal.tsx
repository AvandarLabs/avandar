import { makeObject, propEq, propNotEq } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { isShareableDashboardLimitError } from "@/utils/isShareableDashboardLimitError/isShareableDashboardLimitError";
import { notifyError } from "@/utils/notifications/notify";
import {
  buildShareSummary,
  hasPrincipalId,
} from "./buildShareSummary/buildShareSummary";
import { ShareAddPrincipalRow } from "./ShareAddPrincipalRow/ShareAddPrincipalRow";
import { ShareGeneralAccess } from "./ShareGeneralAccess/ShareGeneralAccess";
import { SharePrincipalList } from "./SharePrincipalList";
import { ShareSummaryLine } from "./ShareSummaryLine/ShareSummaryLine";
import { useGeneralAccessControl } from "./useGeneralAccessControl";
import type { DisplayShare } from "./SharePrincipalList";
import type { ShareResourcePublishing } from "./ShareResourceModal.types";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { I18n } from "@lingui/core";
import type { WorkspaceMemberProfile } from "$/models/User/UserProfile.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

type Props = {
  resourceName: string;
  resourceType: ResourceType;
  resourceId: string;
  /** Only dashboards have a published form; datasets omit this entirely. */
  publishing?: ShareResourcePublishing;
  /**
   * Whether the viewer may write share rows. Defaults to `true` because every
   * caller but the dashboard one only opens this modal for resource admins. A
   * dashboard editor may publish without being allowed to hand out access, so
   * the sharing half renders read-only for them while publishing stays live.
   */
  canManageShares?: boolean;
  onClose: () => void;
};

/**
 * Resolves the display name for the resource owner from the available
 * lookup tables. Fallback chain: `userById[ownerId]` (preferred display
 * name), then the member's `email` from the workspace members list,
 * finally "Unknown user" (the same last resort the other principal rows use)
 * when the owner has no readable profile. That last resort must not read
 * "Owner": the row already carries an Owner badge, so the two would render
 * as a confusing "Owner Owner" pair.
 */
function resolveOwnerDisplayName(
  ownerId: string,
  members: WorkspaceMemberProfile[] | undefined,
  userById: Readonly<Record<string, string>>,
  i18n: I18n,
): string {
  return (
    userById[ownerId] ??
    members?.find((member) => {
      return member.userId === ownerId;
    })?.email ??
    i18n._(msg`Unknown user`)
  );
}

/**
 * Drive-style share modal body. Renders the four sections of the new
 * layout and wires their callbacks to `ResourceShareClient` mutations.
 */
export function ShareResourceModal({
  resourceName,
  resourceType,
  resourceId,
  publishing,
  canManageShares = true,
  onClose,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const workspace = useCurrentWorkspace();
  const workspaceId = workspace.id as WorkspaceId;

  const queryKey = ResourceShareClient.QueryKeys.getResourceSharingState({
    workspaceId,
    resourceType,
    resourceId,
  });
  const invalidateKeys = [queryKey];

  const [sharingState, isLoadingState, sharingStateQuery] =
    ResourceShareClient.useGetResourceSharingState({
      workspaceId,
      resourceType,
      resourceId,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const workspaceShare = sharingState?.shares.find(
    propEq("principalType", "workspace"),
  );

  const [members, isLoadingMembers] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId,
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const [userGroups, isLoadingUserGroups] = PermissionsClient.useGetUserGroups({
    workspaceId,
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });

  const [upsertShare, isUpserting] = ResourceShareClient.useUpsertResourceShare(
    {
      queriesToInvalidate: invalidateKeys,
      onError: (error: Error) => {
        // Adding the first non-owner reader to a published, self-only
        // dashboard makes it reachable by somebody else, which is exactly what
        // the plan caps. Nothing gates this write in the UI, so the database
        // trigger is where the user meets the limit, and the generic message
        // would leave them with no idea why.
        //
        // A toast rather than the upgrade modal: the person is in the middle
        // of handing out access, and the design puts the upgrade offer on the
        // publish action, which is where the limit is actually about to be
        // spent.
        if (isShareableDashboardLimitError(error)) {
          notifyError({
            title: t`Shared dashboard limit reached`,
            message: t`Your plan does not allow sharing this dashboard with anyone else. Upgrade your plan, or unshare another dashboard, and try again.`,
          });
          return;
        }
        notifyError({ title: t`Share failed`, message: error.message });
      },
    },
  );

  const [deleteShare] = ResourceShareClient.useDeleteResourceShare({
    queriesToInvalidate: invalidateKeys,
    onError: (error: Error) => {
      notifyError({ title: t`Remove failed`, message: error.message });
    },
  });

  const [setRestricted] = ResourceShareClient.useSetResourceRestricted({
    queriesToInvalidate: invalidateKeys,
    onError: (error: Error) => {
      notifyError({
        title: t`Restriction update failed`,
        message: error.message,
      });
    },
  });

  const generalAccess = useGeneralAccessControl({
    resourceName,
    resourceType,
    resourceId,
    workspaceId,
    sharingState,
    workspaceShare,
    queryKey,
    isSharingStateFetching: sharingStateQuery.isFetching,
    upsertShare,
    deleteShare,
    setRestricted,
    // Two flags, deliberately not one. The dropdown follows the PENDING
    // target so a pick does not snap back mid-request; the "Make private"
    // warning follows what is PUBLISHED, because revoking shares leaves a
    // public dashboard world-readable no matter what the dropdown now says.
    isPublicPublishTargeted: publishing?.targetVisibility === "public",
    isPubliclyPublished: publishing?.currentVisibility === "public",
  });

  const userById = useMemo((): Record<string, string> => {
    return makeObject(members ?? [], {
      key: "userId",
      valueFn: (member): string => {
        return member.displayName || member.fullName;
      },
    });
  }, [members]);

  const groupById = useMemo((): Record<string, string> => {
    return makeObject(userGroups ?? [], { key: "id", valueKey: "name" });
  }, [userGroups]);

  // The principal lookups gate rendering alongside the sharing state: every
  // row's label (the owner row included) comes from them, so rendering early
  // would flash placeholder names and an incomplete Add list.
  if (
    isLoadingState ||
    !sharingState ||
    isLoadingMembers ||
    isLoadingUserGroups
  ) {
    return (
      <Stack gap="md">
        <Text>
          <Trans>Loading sharing settings…</Trans>
        </Text>
      </Stack>
    );
  }

  const directShares = sharingState.shares.filter(
    propNotEq("principalType", "workspace"),
  );

  // Build an in-memory Owner row for display only. The owner is the
  // resource row's `owner_id`, not a `resource_shares` row, so we never
  // write back through this entry; the row is read-only at the UI.
  const ownerDisplayName = resolveOwnerDisplayName(
    sharingState.ownerId,
    members,
    userById,
    i18n,
  );

  const ownerShare: DisplayShare = {
    id: `__owner__:${sharingState.ownerId}`,
    workspaceId,
    resourceType,
    resourceId,
    principalType: "user",
    principalId: sharingState.ownerId,
    role: "admin",
    requiresAppAccess: false,
    displayName: ownerDisplayName,
    isOwnerRow: true,
  };

  // Sort: owner first; then users (alphabetical); then user_groups
  // (alphabetical). Excludes any explicit share for the owner if present
  // because it would shadow the read-only Owner row.
  const filteredDirectShares = directShares.filter((share) => {
    const isOwnerUserShare =
      share.principalType === "user" &&
      share.principalId === sharingState.ownerId;
    return !isOwnerUserShare;
  });

  const userShares = filteredDirectShares
    .filter(hasPrincipalId)
    .filter(propEq("principalType", "user"))
    .map((share): DisplayShare => {
      return {
        ...share,
        displayName: userById[share.principalId] ?? t`Unknown user`,
      };
    })
    .sort((a, b) => {
      return a.displayName.localeCompare(b.displayName);
    });

  const groupShares = filteredDirectShares
    .filter(hasPrincipalId)
    .filter(propEq("principalType", "user_group"))
    .map((share): DisplayShare => {
      return {
        ...share,
        displayName: groupById[share.principalId] ?? t`Unknown group`,
      };
    })
    .sort((a, b) => {
      return a.displayName.localeCompare(b.displayName);
    });

  const displayShares: DisplayShare[] = [
    ownerShare,
    ...userShares,
    ...groupShares,
  ];

  const spans = buildShareSummary({
    shares: filteredDirectShares,
    isRestricted: sharingState.isRestricted,
    workspaceShareRole: workspaceShare?.role ?? null,
    resourceType,
    workspaceName: workspace.name,
    userById,
    groupById,
    // The persisted value, not the target: this sentence states what IS true
    // of the resource. A draft whose owner has just picked "Anyone with the
    // link" is not published on the web, and saying so would be the same class
    // of false reassurance the Only me confirmation was fixed for. The pending
    // change is reported by the status alert, which exists to say exactly that.
    publication: publishing ? publishing.currentVisibility : undefined,
  });

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        <Trans>Share &ldquo;{resourceName}&rdquo;</Trans>
      </Text>

      <ShareGeneralAccess
        resourceType={resourceType}
        value={generalAccess.displayedValue}
        isOwner={generalAccess.isOwner}
        isBusy={generalAccess.isBusy || !canManageShares}
        workspaceShareRole={workspaceShare?.role ?? null}
        isPublicOptionAvailable={publishing !== undefined}
        publicOptionDisabledReason={publishing?.publicOptionDisabledReason}
        onChange={(value) => {
          // The dropdown moves the publish target and writes share state; it
          // never writes visibility. The footer button does that.
          publishing?.onGeneralAccessChange(value);
          generalAccess.onChange(value);
        }}
        onWorkspaceRoleChange={generalAccess.onWorkspaceRoleChange}
      />

      <Stack gap="xs">
        <Text fw={600} size="sm">
          <Trans>Give access to additional members</Trans>
        </Text>

        <ShareAddPrincipalRow
          members={(members ?? []).map((member) => {
            return {
              value: member.userId,
              label: member.displayName || member.fullName,
            };
          })}
          groups={(userGroups ?? []).map((group) => {
            return { value: group.id, label: group.name };
          })}
          isAdding={isUpserting}
          isDisabled={
            generalAccess.displayedValue === "private" ||
            generalAccess.isBusy ||
            !canManageShares
          }
          onAdd={({ principalType, principalId, role }) => {
            upsertShare({
              workspaceId,
              resourceType,
              resourceId,
              principalType,
              principalId,
              role,
              requiresAppAccess: false,
            });
          }}
        />
      </Stack>

      <SharePrincipalList
        shares={displayShares}
        resourceType={resourceType}
        isReadOnly={!canManageShares}
        onRoleChange={(share, role) => {
          if (share.isOwnerRow) {
            return;
          }
          upsertShare({
            workspaceId,
            resourceType,
            resourceId,
            principalType: share.principalType,
            principalId: share.principalId,
            role,
            requiresAppAccess: share.requiresAppAccess,
          });
        }}
        onToggleRequiresAppAccess={(share, next) => {
          if (share.isOwnerRow || share.principalType !== "user_group") {
            return;
          }
          upsertShare({
            workspaceId,
            resourceType,
            resourceId,
            principalType: share.principalType,
            principalId: share.principalId,
            role: share.role,
            requiresAppAccess: next,
          });
        }}
        onRemove={(share) => {
          if (share.isOwnerRow) {
            return;
          }
          deleteShare({ shareId: share.id });
        }}
      />

      <ShareSummaryLine spans={spans} />

      {publishing?.section}

      <Group justify={publishing ? "space-between" : "flex-end"} mt="md">
        <Button variant="default" onClick={onClose}>
          <Trans>Done</Trans>
        </Button>
        {publishing?.actions}
      </Group>
    </Stack>
  );
}
