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
import { useReducer } from "react";
import { match } from "ts-pattern";
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

type EditorState = {
  editorOpen: boolean;
  editingGroup: RoleGroupWithMatrix | undefined;
  nameDraft: string;
  matrixDraft: UserAppRolesMatrix;
  builtinPresetType: BuiltinPresetType;
};

type EditorAction =
  | {
      type: "openCreate";
      matrixDraft: UserAppRolesMatrix;
      builtinPresetType: BuiltinPresetType;
    }
  | { type: "openEdit"; group: RoleGroupWithMatrix }
  | { type: "close" }
  | { type: "nameChanged"; nameDraft: string }
  | {
      type: "matrixChanged";
      matrixDraft: UserAppRolesMatrix;
      builtinPresetType: BuiltinPresetType;
    }
  | { type: "builtinPresetTypeChanged"; builtinPresetType: BuiltinPresetType };

const INITIAL_EDITOR_STATE: EditorState = {
  editorOpen: false,
  editingGroup: undefined,
  nameDraft: "",
  matrixDraft: {
    data_sources: undefined,
    data_explorer: undefined,
    dashboards: undefined,
    gis: undefined,
    settings: undefined,
  },
  builtinPresetType: "custom",
};

function _editorReducer(state: EditorState, action: EditorAction): EditorState {
  return match(action)
    .with({ type: "openCreate" }, ({ matrixDraft, builtinPresetType }) => {
      return {
        editorOpen: true,
        editingGroup: undefined,
        nameDraft: "",
        matrixDraft,
        builtinPresetType,
      };
    })
    .with({ type: "openEdit" }, ({ group }) => {
      return {
        editorOpen: true,
        editingGroup: group,
        nameDraft: group.name,
        matrixDraft: group.roleMatrix,
        builtinPresetType:
          Permissions.RolesMatrix.roleGroupPresetTypeFromRoleMatrix(
            group.roleMatrix,
          ),
      };
    })
    .with({ type: "close" }, () => {
      return { ...state, editorOpen: false };
    })
    .with({ type: "nameChanged" }, ({ nameDraft }) => {
      return { ...state, nameDraft };
    })
    .with({ type: "matrixChanged" }, ({ matrixDraft, builtinPresetType }) => {
      return {
        ...state,
        matrixDraft,
        builtinPresetType,
      };
    })
    .with({ type: "builtinPresetTypeChanged" }, ({ builtinPresetType }) => {
      return {
        ...state,
        builtinPresetType,
      };
    })
    .exhaustive();
}

/**
 * Built-in presets (read-only) and CRUD for custom role groups.
 */
export function WorkspaceRolesTab(): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [editorState, dispatchEditor] = useReducer(
    _editorReducer,
    INITIAL_EDITOR_STATE,
  );
  const {
    editorOpen,
    editingGroup,
    nameDraft,
    matrixDraft,
    builtinPresetType,
  } = editorState;

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
      dispatchEditor({ type: "close" });
    },
    onError: (error: Error) => {
      notifyError({ title: t`Create failed`, message: error.message });
    },
    queriesToInvalidate: invalidate,
  });

  const [updateGroup, isUpdating] = PermissionsClient.useUpdateCustomRoleGroup({
    onSuccess: () => {
      notifySuccess({ title: t`Role group updated` });
      dispatchEditor({ type: "close" });
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
    dispatchEditor({
      type: "openCreate",
      matrixDraft:
        Permissions.RolesMatrix.roleMatrixFromPresetType("global_viewer"),
      builtinPresetType: "global_viewer",
    });
  };

  const openEdit = (group: RoleGroupWithMatrix): void => {
    dispatchEditor({ type: "openEdit", group });
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
          dispatchEditor({ type: "close" });
        }}
        title={editingGroup ? t`Edit role group` : t`New role group`}
      >
        <Stack gap="md">
          <TextInput
            label={t`Name`}
            value={nameDraft}
            onChange={(e) => {
              dispatchEditor({
                type: "nameChanged",
                nameDraft: e.currentTarget.value,
              });
            }}
          />
          <WorkspaceAppRoleMatrixForm
            rolesMatrix={matrixDraft}
            onRolesMatrixChange={(next) => {
              dispatchEditor({
                type: "matrixChanged",
                matrixDraft: next,
                builtinPresetType:
                  Permissions.RolesMatrix.roleGroupPresetTypeFromRoleMatrix(
                    next,
                  ),
              });
            }}
            builtinPresetTypes={builtinPresetType}
            onBuiltinPresetTypeChange={(next) => {
              dispatchEditor({
                type: "builtinPresetTypeChanged",
                builtinPresetType: next,
              });
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
