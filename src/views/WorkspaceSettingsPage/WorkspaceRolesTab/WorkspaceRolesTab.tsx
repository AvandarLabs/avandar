import { propEq } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Card,
  Group,
  LoadingOverlay,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { Permissions } from "$/models/Permissions/Permissions";
import { BUILTIN_ROLE_GROUP_NAMES } from "$/models/Permissions/PermissionsModule/RolesMatrixModule/preset-role-matrices";
import { useState } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { partition } from "@/lib/utils/arrays/partition/partition";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { WorkspaceAppRoleMatrixForm } from "@/views/WorkspaceSettingsPage/WorkspaceAppRoleMatrixForm/WorkspaceAppRoleMatrixForm";
import type { RoleGroupWithMatrix } from "@/clients/permissions/PermissionsClient";
import type {
  BuiltinPresetType,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types";

/**
 * Built-in presets (read-only) and CRUD for custom role groups.
 */
export function WorkspaceRolesTab(): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RoleGroupWithMatrix | null>(
    null,
  );
  const [nameDraft, setNameDraft] = useState("");
  const [matrixDraft, setMatrixDraft] = useState<UserAppRolesMatrix>({
    data_sources: undefined,
    data_explorer: undefined,
    dashboards: undefined,
    settings: undefined,
  });
  const [builtinPresetType, setBuiltinPresetType] =
    useState<BuiltinPresetType>("custom");

  const [roleGroups = [], roleGroupsLoading] =
    PermissionsClient.useGetRoleGroupsWithMatrices({
      workspaceId: workspace.id,
    });

  const invalidate = [
    PermissionsClient.QueryKeys.getRoleGroupsWithMatrices({
      workspaceId: workspace.id,
    }),
  ];

  const [createGroup, isCreating] = PermissionsClient.useCreateCustomRoleGroup({
    onSuccess: () => {
      notifySuccess({ title: t`Role group created` });
      setEditorOpen(false);
    },
    onError: (error: Error) => {
      notifyError({ title: t`Create failed`, message: error.message });
    },
    queriesToInvalidate: invalidate,
  });

  const [updateGroup, isUpdating] = PermissionsClient.useUpdateCustomRoleGroup({
    onSuccess: () => {
      notifySuccess({ title: t`Role group updated` });
      setEditorOpen(false);
    },
    onError: (error: Error) => {
      notifyError({ title: t`Update failed`, message: error.message });
    },
    queriesToInvalidate: invalidate,
  });

  const [deleteGroup] = PermissionsClient.useDeleteCustomRoleGroup({
    onSuccess: () => {
      notifySuccess({ title: t`Role group deleted` });
    },
    onError: (error: Error) => {
      notifyError({ title: t`Delete failed`, message: error.message });
    },
    queriesToInvalidate: invalidate,
  });

  const [builtins, customs] = partition(roleGroups, propEq("isBuiltin", true));

  const openCreate = (): void => {
    setEditingGroup(null);
    setNameDraft("");
    setMatrixDraft(
      Permissions.RolesMatrix.roleMatrixFromPresetType("global_viewer"),
    );
    setBuiltinPresetType("global_viewer");
    setEditorOpen(true);
  };

  const openEdit = (group: RoleGroupWithMatrix): void => {
    setEditingGroup(group);
    setNameDraft(group.name);
    setMatrixDraft(group.roleMatrix);
    setBuiltinPresetType(
      Permissions.RolesMatrix.roleGroupPresetTypeFromRoleMatrix(
        group.roleMatrix,
      ),
    );
    setEditorOpen(true);
  };

  const onSaveEditor = (): void => {
    if (!nameDraft.trim()) {
      notifyError({ title: t`Name required` });
      return;
    }
    if (editingGroup) {
      updateGroup({
        workspaceId: workspace.id,
        roleGroupId: editingGroup.id,
        name: nameDraft.trim(),
        matrix: matrixDraft,
      });
    } else {
      createGroup({
        workspaceId: workspace.id,
        name: nameDraft.trim(),
        matrix: matrixDraft,
      });
    }
  };

  return (
    <Card withBorder p="lg" w="100%" maw="1000px">
      <LoadingOverlay visible={roleGroupsLoading} />
      <Stack gap="lg">
        <Title order={4}>
          <Trans>Built-in presets</Trans>
        </Title>
        <Text size="sm" c="dimmed">
          <Trans>
            {BUILTIN_ROLE_GROUP_NAMES.globalAdmin},{" "}
            {BUILTIN_ROLE_GROUP_NAMES.globalEditor}, and{" "}
            {BUILTIN_ROLE_GROUP_NAMES.globalViewer} are fixed for every
            workspace.
          </Trans>
        </Text>
        {builtins.map((roleGroup: RoleGroupWithMatrix) => {
          return (
            <Group key={roleGroup.id} justify="space-between">
              <Text fw={500}>{roleGroup.name}</Text>
              <Text size="sm" c="dimmed">
                <Trans>Preset</Trans>
              </Text>
            </Group>
          );
        })}
        <Group justify="space-between">
          <Title order={4}>
            <Trans>Custom role groups</Trans>
          </Title>
          <Button size="xs" onClick={openCreate}>
            <Trans>New role group</Trans>
          </Button>
        </Group>
        {customs.length === 0 ?
          <Text size="sm" c="dimmed">
            <Trans>No custom groups yet.</Trans>
          </Text>
        : null}
        {customs.map((g: RoleGroupWithMatrix) => {
          return (
            <Group key={g.id} justify="space-between">
              <Text>{g.name}</Text>
              <Group gap="xs">
                <IconEdit
                  size={18}
                  style={{ cursor: "pointer" }}
                  aria-label={t`Edit role group`}
                  onClick={() => {
                    openEdit(g);
                  }}
                />
                <IconTrash
                  size={18}
                  style={{ cursor: "pointer" }}
                  aria-label={t`Delete role group`}
                  onClick={() => {
                    modals.openConfirmModal({
                      title: t`Delete role group`,
                      children: t`Members still assigned to this group must be moved first.`,
                      labels: { confirm: t`Delete`, cancel: t`Cancel` },
                      confirmProps: { color: "red" },
                      onConfirm: () => {
                        deleteGroup({
                          workspaceId: workspace.id,
                          roleGroupId: g.id,
                        });
                      },
                    });
                  }}
                />
              </Group>
            </Group>
          );
        })}
      </Stack>
      <Modal
        opened={editorOpen}
        onClose={() => {
          setEditorOpen(false);
        }}
        title={editingGroup ? t`Edit role group` : t`New role group`}
      >
        <Stack gap="md">
          <TextInput
            label={t`Name`}
            value={nameDraft}
            onChange={(e) => {
              setNameDraft(e.currentTarget.value);
            }}
          />
          <WorkspaceAppRoleMatrixForm
            rolesMatrix={matrixDraft}
            onRolesMatrixChange={(next) => {
              setMatrixDraft(next);
              setBuiltinPresetType(
                Permissions.RolesMatrix.roleGroupPresetTypeFromRoleMatrix(next),
              );
            }}
            builtinPresetTypes={builtinPresetType}
            onBuiltinPresetTypeChange={(next) => {
              setBuiltinPresetType(next);
            }}
            disabled={isCreating || isUpdating}
          />
          <Button loading={isCreating || isUpdating} onClick={onSaveEditor}>
            <Trans>Save</Trans>
          </Button>
        </Stack>
      </Modal>
    </Card>
  );
}
