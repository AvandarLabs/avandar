import {
  Button,
  Group,
  MultiSelect,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { notifyError, notifySuccess } from "@ui";
import { useMemo, useState } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const ROLE_OPTIONS: Array<{ value: RoleLevel; label: string }> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

type Props = {
  resourceName: string;
  resourceType: ResourceType;
  resourceId: string;
  onClose: () => void;
};

type AddTargetValue = `user:${string}` | `user_group:${string}`;

/**
 * Google Drive-style sharing dialog for one dashboard or dataset.
 */
export function ShareResourceModal({
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

  const [sharingState, isLoadingState] =
    ResourceShareClient.useGetResourceSharingState({
      workspaceId,
      resourceType,
      resourceId,
    });

  const [members] = WorkspaceClient.useGetUsersForWorkspace({ workspaceId });
  const [userGroups, isLoadingGroups] = PermissionsClient.useGetUserGroups({
    workspaceId,
  });

  const [addTarget, setAddTarget] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<RoleLevel>("viewer");

  const invalidateKeys = [queryKey];

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

  const [setRestricted, isSavingRestricted] =
    ResourceShareClient.useSetResourceRestricted({
      queriesToInvalidate: invalidateKeys,
      onError: (error: Error) => {
        notifyError({
          title: "Restriction update failed",
          message: error.message,
        });
      },
    });

  const [setResourceTags, isSavingTags] =
    ResourceShareClient.useSetResourceUserGroupTags({
      queriesToInvalidate: invalidateKeys,
      onError: (error: Error) => {
        notifyError({ title: "Tags update failed", message: error.message });
      },
    });

  const addOptions = useMemo(() => {
    const userOpts = (members ?? []).map((member) => {
      return {
        value: `user:${member.userId}` as AddTargetValue,
        label: member.displayName || member.fullName,
      };
    });
    const groupOpts = (userGroups ?? []).map((group) => {
      return {
        value: `user_group:${group.id}` as AddTargetValue,
        label: group.name,
      };
    });

    const groups: Array<{
      group: string;
      items: Array<{ value: AddTargetValue; label: string }>;
    }> = [];

    if (userOpts.length > 0) {
      groups.push({ group: "Members", items: userOpts });
    }
    if (groupOpts.length > 0) {
      groups.push({ group: "Tags", items: groupOpts });
    }

    return groups;
  }, [members, userGroups]);

  const tagSelectData = useMemo(() => {
    return (userGroups ?? []).map((group) => {
      return { value: group.id, label: group.name };
    });
  }, [userGroups]);

  const workspaceShare = sharingState?.shares.find((share) => {
    return share.principalType === "workspace";
  });

  const directShares = sharingState?.shares.filter((share) => {
    return share.principalType !== "workspace";
  });

  const onAddShare = (): void => {
    if (!addTarget) {
      return;
    }

    const [kind, id] = addTarget.split(":") as ["user" | "user_group", string];

    upsertShare({
      workspaceId,
      resourceType,
      resourceId,
      principalType: kind,
      principalId: id,
      role: addRole,
    });
    setAddTarget(null);
  };

  const onShareRoleChange = (
    share: ResourceShareRow,
    role: RoleLevel | null,
  ): void => {
    if (!role) {
      return;
    }

    upsertShare({
      workspaceId,
      resourceType,
      resourceId,
      principalType: share.principalType,
      principalId: share.principalId,
      role,
    });
  };

  const labelForShare = (share: ResourceShareRow): string => {
    if (share.principalType === "user" && share.principalId) {
      const member = members?.find((row) => {
        return row.userId === share.principalId;
      });
      return member?.displayName ?? member?.fullName ?? share.principalId;
    }

    if (share.principalType === "user_group" && share.principalId) {
      const group = userGroups?.find((row) => {
        return row.id === share.principalId;
      });
      return group?.name ?? share.principalId;
    }

    return "Unknown";
  };

  if (isLoadingState || !sharingState) {
    return (
      <Stack gap="md">
        <Text>Loading sharing settings…</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Share &ldquo;{resourceName}&rdquo;
      </Text>

      <Stack gap="xs">
        <Text fw={600} size="sm">
          Workspace access
        </Text>
        <Group wrap="nowrap" align="flex-end">
          <Select
            flex={1}
            label="Role for everyone in the workspace"
            data={ROLE_OPTIONS}
            value={workspaceShare?.role ?? null}
            placeholder="No workspace access"
            clearable
            onChange={(role) => {
              if (!role) {
                if (workspaceShare) {
                  deleteShare({ shareId: workspaceShare.id });
                }
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
            }}
          />
        </Group>
      </Stack>

      <Stack gap="xs">
        <Text fw={600} size="sm">
          People and tags
        </Text>
        {(directShares ?? []).map((share) => {
          return (
            <Group key={share.id} wrap="nowrap">
              <Text flex={1} size="sm">
                {labelForShare(share)}
              </Text>
              <Select
                w={120}
                data={ROLE_OPTIONS}
                value={share.role}
                onChange={(role) => {
                  onShareRoleChange(share, role);
                }}
              />
              <Button
                variant="subtle"
                color="red"
                size="compact-sm"
                onClick={() => {
                  deleteShare({ shareId: share.id });
                }}
              >
                Remove
              </Button>
            </Group>
          );
        })}
        <Group align="flex-end" wrap="nowrap">
          <Select
            flex={1}
            label="Add member or tag"
            placeholder="Select…"
            data={addOptions}
            value={addTarget}
            onChange={setAddTarget}
            searchable
          />
          <Select
            w={120}
            label="Role"
            data={ROLE_OPTIONS}
            value={addRole}
            onChange={(value) => {
              if (value) {
                setAddRole(value);
              }
            }}
          />
          <Button loading={isUpserting} onClick={onAddShare}>
            Add
          </Button>
        </Group>
      </Stack>

      <MultiSelect
        label="Resource tags"
        description="Members with matching tags get default access (unless restricted)."
        data={tagSelectData}
        value={[...sharingState.resourceTagIds]}
        disabled={isLoadingGroups || isSavingTags}
        onChange={(tagIds) => {
          setResourceTags({
            workspaceId,
            resourceType,
            resourceId,
            userGroupIds: tagIds,
          });
        }}
      />

      <Switch
        label="Restrict access — only people listed above can access"
        checked={sharingState.isRestricted}
        disabled={isSavingRestricted}
        onChange={(event) => {
          setRestricted({
            workspaceId,
            resourceType,
            resourceId,
            isRestricted: event.currentTarget.checked,
          });
          notifySuccess({
            title:
              event.currentTarget.checked ?
                "Access restricted"
              : "Restriction removed",
          });
        }}
      />

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          Done
        </Button>
      </Group>
    </Stack>
  );
}
