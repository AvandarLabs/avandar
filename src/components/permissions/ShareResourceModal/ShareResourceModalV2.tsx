import { Button, Group, Stack, Text } from "@mantine/core";
import { notifyError } from "@ui";
import { useMemo } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ShareAddPrincipalRow } from "./ShareAddPrincipalRow";
import { ShareGeneralAccess } from "./ShareGeneralAccess";
import { SharePrincipalList } from "./SharePrincipalList";
import { buildShareSummary, hasPrincipalId } from "./shareSummary";
import { ShareSummaryLine } from "./ShareSummaryLine";
import type { DisplayShare } from "./SharePrincipalList";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
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
 * finally the literal "Owner" string when nothing is available.
 */
function resolveOwnerDisplayName(
  ownerId: string,
  members: readonly WorkspaceMemberProfile[] | undefined,
  userById: Readonly<Record<string, string>>,
): string {
  return (
    userById[ownerId] ??
    members?.find((m) => {
      return m.userId === ownerId;
    })?.email ??
    "Owner"
  );
}

/**
 * Drive-style share modal body. Renders the four sections of the new
 * layout and wires their callbacks to `ResourceShareClient` mutations.
 */
export function ShareResourceModalV2({
  resourceName,
  resourceType,
  resourceId,
  onClose,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const workspaceId = workspace.id as WorkspaceId;

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

  const [members] = WorkspaceClient.useGetUsersForWorkspace({ workspaceId });
  const [userGroups] = PermissionsClient.useGetUserGroups({ workspaceId });

  const [upsertShare, isUpserting] = ResourceShareClient.useUpsertResourceShare(
    {
      queriesToInvalidate: invalidateKeys,
      onError: (error: Error) => {
        notifyError({ title: "Share failed", message: error.message });
      },
    },
  );

  const [deleteShare] = ResourceShareClient.useDeleteResourceShare({
    queriesToInvalidate: invalidateKeys,
    onError: (error: Error) => {
      notifyError({ title: "Remove failed", message: error.message });
    },
  });

  const [setRestricted] = ResourceShareClient.useSetResourceRestricted({
    queriesToInvalidate: invalidateKeys,
    onError: (error: Error) => {
      notifyError({
        title: "Restriction update failed",
        message: error.message,
      });
    },
  });

  const userById = useMemo(() => {
    const out: Record<string, string> = {};
    (members ?? []).forEach((m) => {
      out[m.userId] = m.displayName || m.fullName;
    });
    return out;
  }, [members]);

  const groupById = useMemo(() => {
    const out: Record<string, string> = {};
    (userGroups ?? []).forEach((g) => {
      out[g.id] = g.name;
    });
    return out;
  }, [userGroups]);

  if (isLoadingState || !sharingState) {
    return (
      <Stack gap="md">
        <Text>Loading sharing settings…</Text>
      </Stack>
    );
  }

  const workspaceShare = sharingState.shares.find((s) => {
    return s.principalType === "workspace";
  });
  const directShares: readonly ResourceShareRow[] = sharingState.shares.filter(
    (s) => {
      return s.principalType !== "workspace";
    },
  );

  // Build an in-memory Owner row for display only. The owner is the
  // resource row's `owner_id`, not a `resource_shares` row, so we never
  // write back through this entry; the row is read-only at the UI.
  const ownerDisplayName = resolveOwnerDisplayName(
    sharingState.ownerId,
    members,
    userById,
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
  const filteredDirectShares = directShares.filter((s) => {
    return !(
      s.principalType === "user" && s.principalId === sharingState.ownerId
    );
  });

  const userShares = filteredDirectShares
    .filter(hasPrincipalId)
    .filter((s) => {
      return s.principalType === "user";
    })
    .map((s): DisplayShare => {
      return {
        ...s,
        displayName: userById[s.principalId] ?? "Unknown user",
      };
    })
    .sort((a, b) => {
      return a.displayName.localeCompare(b.displayName);
    });

  const groupShares = filteredDirectShares
    .filter(hasPrincipalId)
    .filter((s) => {
      return s.principalType === "user_group";
    })
    .map((s): DisplayShare => {
      return {
        ...s,
        displayName: groupById[s.principalId] ?? "Unknown group",
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

  const onGeneralAccessChange = (next: {
    isRestricted: boolean;
    role: RoleLevel | null;
  }): void => {
    // Skip no-op writes: bail when nothing meaningful changed.
    const restrictedUnchanged = next.isRestricted === sharingState.isRestricted;
    const roleUnchanged = next.role === (workspaceShare?.role ?? null);
    if (restrictedUnchanged && roleUnchanged) {
      return;
    }

    if (next.isRestricted !== sharingState.isRestricted) {
      setRestricted({
        workspaceId,
        resourceType,
        resourceId,
        isRestricted: next.isRestricted,
      });
    }
    if (!next.isRestricted && next.role) {
      upsertShare({
        workspaceId,
        resourceType,
        resourceId,
        principalType: "workspace",
        principalId: null,
        role: next.role,
      });
    } else if (next.isRestricted && workspaceShare) {
      deleteShare({ shareId: workspaceShare.id });
    }
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Share &ldquo;{resourceName}&rdquo;
      </Text>

      <ShareAddPrincipalRow
        members={(members ?? []).map((m) => {
          return {
            value: m.userId,
            label: m.displayName || m.fullName,
          };
        })}
        groups={(userGroups ?? []).map((g) => {
          return { value: g.id, label: g.name };
        })}
        isAdding={isUpserting}
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
        isRestricted={sharingState.isRestricted}
        workspaceShareRole={workspaceShare?.role ?? null}
        onChange={onGeneralAccessChange}
      />

      <ShareSummaryLine spans={spans} />

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          Done
        </Button>
      </Group>
    </Stack>
  );
}
