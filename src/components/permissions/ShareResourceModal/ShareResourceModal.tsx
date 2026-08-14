import { makeObject, propEq, propNotEq } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { appLabel } from "$/copy/appLabel";
import { useMemo, useState } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError } from "@/utils/notifications/notify";
import {
  buildShareSummary,
  hasPrincipalId,
} from "./buildShareSummary/buildShareSummary";
import { deriveGeneralAccessValue } from "./deriveGeneralAccess/deriveGeneralAccess";
import { openMakePrivateConfirmModal } from "./openMakePrivateConfirmModal";
import { ShareAddPrincipalRow } from "./ShareAddPrincipalRow/ShareAddPrincipalRow";
import { appForResource, useShareCopy } from "./shareCopy";
import { ShareGeneralAccess } from "./ShareGeneralAccess/ShareGeneralAccess";
import { SharePrincipalList } from "./SharePrincipalList";
import { ShareSummaryLine } from "./ShareSummaryLine/ShareSummaryLine";
import type { GeneralAccessValue } from "./deriveGeneralAccess/deriveGeneralAccess";
import type { DisplayShare } from "./SharePrincipalList";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { I18n } from "@lingui/core";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { WorkspaceMemberProfile } from "$/models/User/UserProfile.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

type Props = {
  resourceName: string;
  resourceType: ResourceType;
  resourceId: string;
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
  onClose,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const workspace = useCurrentWorkspace();
  const workspaceId = workspace.id as WorkspaceId;
  const currentUser = useCurrentUser();
  const shareCopy = useShareCopy();

  // "I intend to add people", not a stored state. Selecting `Restricted` while
  // private writes nothing, so without this the dropdown would snap straight
  // back to "Only me". Lost on unmount, which is why reopening the modal on a
  // still-empty resource correctly shows "Only me" again.
  const [wantsRestricted, setWantsRestricted] = useState(false);

  const queryKey = ResourceShareClient.QueryKeys.getResourceSharingState({
    workspaceId,
    resourceType,
    resourceId,
  });
  const invalidateKeys = [queryKey];

  const [sharingState, isLoadingState] =
    ResourceShareClient.useGetResourceSharingState({
      workspaceId,
      resourceType,
      resourceId,
    });

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

  const [makeResourcePrivate, isMakingPrivate] =
    ResourceShareClient.useMakeResourcePrivate({
      queriesToInvalidate: invalidateKeys,
      onError: (error: Error) => {
        notifyError({
          title: t`Could not make private`,
          message: error.message,
        });
      },
      onSuccess: () => {
        setWantsRestricted(false);
      },
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

  const workspaceShare = sharingState.shares.find(
    propEq("principalType", "workspace"),
  );
  const directShares = sharingState.shares.filter(
    propNotEq("principalType", "workspace"),
  );

  // Fails closed. useCurrentUser reads the _auth route context and this modal
  // only ever mounts inside it, so undefined is unreachable in practice;
  // treating it as "not the owner" is still the right default for a control
  // that deletes shares.
  const isOwner = sharingState.ownerId === currentUser?.id;

  const derivedGeneralAccess = deriveGeneralAccessValue({
    isRestricted: sharingState.isRestricted,
    shares: sharingState.shares,
    ownerId: sharingState.ownerId,
  });

  const displayedGeneralAccess: GeneralAccessValue =
    derivedGeneralAccess === "private" && wantsRestricted ?
      "restricted"
    : derivedGeneralAccess;

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
  });

  // Makes the resource private, confirming first whenever someone would lose
  // access. Owner-only: the RPC rejects a non-owner server-side, and the
  // dropdown disables the option for them, so this gate is defense in depth.
  const requestMakePrivate = (): void => {
    if (!isOwner) {
      return;
    }

    const numUsers = userShares.length;
    const numGroups = groupShares.length;
    // Keyed off `isRestricted` first, NOT off the presence of a
    // workspace-principal share row alone. An unrestricted resource with no
    // such row still grants access through workspace app roles, so keying
    // off the row would drop the warning in the case that matters most. The
    // row is then ORed in so a restricted resource shared workspace-wide
    // still warns instead of silently dropping that share.
    const losesWorkspaceAccess =
      !sharingState.isRestricted || workspaceShare !== undefined;

    if (numUsers + numGroups === 0 && !losesWorkspaceAccess) {
      makeResourcePrivate({ resourceType, resourceId });
      return;
    }

    openMakePrivateConfirmModal({
      shareCopy,
      resourceName,
      app: appLabel(appForResource(resourceType)),
      numUsers,
      numGroups,
      losesWorkspaceAccess,
      onConfirm: () => {
        makeResourcePrivate({ resourceType, resourceId });
      },
    });
  };

  // Restricts the resource, so only the owner plus explicitly shared
  // principals can reach it. Writes nothing when the resource is already
  // restricted, which is the case when coming from private.
  const applyRestrictedAccess = (): void => {
    // Always record the intent, even when a write follows. Coming from private
    // this is the whole change; coming from workspace with no other share the
    // write lands on the same derived `private` state, so without the flag the
    // dropdown would snap to "Only me". When shares already exist the flag is
    // inert, since the derived value is `restricted` on its own.
    setWantsRestricted(true);
    if (sharingState.isRestricted) {
      return;
    }
    setRestricted({
      workspaceId,
      resourceType,
      resourceId,
      isRestricted: true,
    });
    if (workspaceShare) {
      deleteShare({ shareId: workspaceShare.id });
    }
  };

  // Opens the resource to the whole workspace, keeping whatever role the
  // existing workspace share already carried.
  const applyWorkspaceAccess = (): void => {
    setWantsRestricted(false);
    if (sharingState.isRestricted) {
      setRestricted({
        workspaceId,
        resourceType,
        resourceId,
        isRestricted: false,
      });
    }
    upsertShare({
      workspaceId,
      resourceType,
      resourceId,
      principalType: "workspace",
      principalId: null,
      role: workspaceShare?.role ?? "viewer",
    });
  };

  const onGeneralAccessChange = (nextAccess: GeneralAccessValue): void => {
    if (nextAccess === displayedGeneralAccess) {
      return;
    }
    if (nextAccess === "private") {
      setWantsRestricted(false);
      requestMakePrivate();
      return;
    }
    if (nextAccess === "restricted") {
      applyRestrictedAccess();
      return;
    }
    applyWorkspaceAccess();
  };

  const onWorkspaceRoleChange = (role: RoleLevel): void => {
    if (role === (workspaceShare?.role ?? null)) {
      return;
    }
    upsertShare({
      workspaceId,
      resourceType,
      resourceId,
      principalType: "workspace",
      principalId: null,
      role,
    });
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        <Trans>Share &ldquo;{resourceName}&rdquo;</Trans>
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
        isDisabled={displayedGeneralAccess === "private"}
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

      <SharePrincipalList
        shares={displayShares}
        resourceType={resourceType}
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

      <ShareGeneralAccess
        resourceType={resourceType}
        value={displayedGeneralAccess}
        isOwner={isOwner}
        isBusy={isMakingPrivate}
        workspaceShareRole={workspaceShare?.role ?? null}
        onChange={onGeneralAccessChange}
        onWorkspaceRoleChange={onWorkspaceRoleChange}
      />

      <ShareSummaryLine spans={spans} />

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          <Trans>Done</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
