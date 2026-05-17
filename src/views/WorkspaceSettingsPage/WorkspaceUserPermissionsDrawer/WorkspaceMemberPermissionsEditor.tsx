import { Button, MultiSelect, Stack, Text } from "@mantine/core";
import { notifyError, notifySuccess } from "@ui";
import { Permissions } from "$/models/Permissions/Permissions";
import { useState } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { WorkspaceAppRoleMatrixForm } from "@/views/WorkspaceSettingsPage/WorkspaceAppRoleMatrixForm/WorkspaceAppRoleMatrixForm";
import type {
  RoleGroupWithMatrix,
  UserGroupRow,
} from "@/clients/permissions/PermissionsClient";
import type {
  BuiltinPresetType,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types";
import type { WorkspaceMemberProfile } from "$/models/User/UserProfile.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

type Props = {
  member: WorkspaceMemberProfile;
  initialMatrix: UserAppRolesMatrix;
  initialTagIds: readonly string[];
  userGroups: readonly UserGroupRow[];
  userGroupsLoading: boolean;
  roleGroups: readonly RoleGroupWithMatrix[];
  workspaceId: WorkspaceId;
  onClose: () => void;
};

/**
 * Editable member permissions form; mount with `key={member.userId}` so state
 * resets when the selected member changes.
 */
export function WorkspaceMemberPermissionsEditor({
  member,
  initialMatrix,
  initialTagIds,
  userGroups,
  userGroupsLoading,
  roleGroups,
  workspaceId,
  onClose,
}: Props): JSX.Element {
  const [matrix, setMatrix] = useState<UserAppRolesMatrix>(initialMatrix);
  const [builtinPresetType, setBuiltinPresetType] = useState<BuiltinPresetType>(
    () => {
      return Permissions.RolesMatrix.roleGroupPresetTypeFromRoleMatrix(
        initialMatrix,
      );
    },
  );
  const [tagIds, setTagIds] = useState<string[]>([...initialTagIds]);

  const invalidateKeys = [
    WorkspaceClient.QueryKeys.getUsersForWorkspace({
      workspaceId,
    }),
    PermissionsClient.QueryKeys.getRoleGroupsWithMatrices({
      workspaceId,
    }),
  ];

  const [saveMember, isSaving] = PermissionsClient.useSaveMemberWorkspaceRoles({
    onSuccess: () => {
      notifySuccess({ title: "Permissions saved" });
      onClose();
    },
    onError: (error: Error) => {
      notifyError({
        title: "Save failed",
        message: error.message,
      });
    },
    queriesToInvalidate: invalidateKeys,
  });

  const onSave = (): void => {
    saveMember({
      workspaceId,
      membershipId: member.membershipId,
      userId: member.userId,
      targetMatrix: matrix,
      userGroupIds: tagIds,
      knownRoleGroups: [...roleGroups],
    });
  };

  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        Choose a workspace preset or customize per app. Tags control dataset and
        dashboard access intersections.
      </Text>
      <WorkspaceAppRoleMatrixForm
        rolesMatrix={matrix}
        onRolesMatrixChange={(next) => {
          setMatrix(next);
          setBuiltinPresetType(
            Permissions.RolesMatrix.roleGroupPresetTypeFromRoleMatrix(next),
          );
        }}
        builtinPresetTypes={builtinPresetType}
        onBuiltinPresetTypeChange={(next) => {
          setBuiltinPresetType(next);
        }}
        disabled={isSaving}
      />
      <MultiSelect
        label="Tags"
        placeholder="Pick tags for this member"
        data={userGroups.map((group: UserGroupRow) => {
          return { value: group.id, label: group.name };
        })}
        value={tagIds}
        onChange={setTagIds}
        disabled={userGroupsLoading || isSaving}
      />
      <Button loading={isSaving} onClick={onSave}>
        Save changes
      </Button>
    </Stack>
  );
}
