import {
  Button,
  Card,
  ColorInput,
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
import { notifyError, notifySuccess } from "@ui";
import { useState } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { UserGroupRow } from "@/clients/permissions/PermissionsClient";

/**
 * CRUD for workspace user-group tags (names + colors).
 */
export function WorkspaceTagsTab(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<UserGroupRow | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [colorDraft, setColorDraft] = useState("#228be6");

  const [groups = [], groupsLoading] = PermissionsClient.useGetUserGroups({
    workspaceId: workspace.id,
  });

  const invalidate = [
    PermissionsClient.QueryKeys.getUserGroups({
      workspaceId: workspace.id,
    }),
  ];

  const [saveGroup, isSaving] = PermissionsClient.useSaveUserGroup({
    onSuccess: () => {
      notifySuccess({ title: "User group saved" });
      setEditorOpen(false);
    },
    onError: (error: Error) => {
      notifyError({ title: "Save failed", message: error.message });
    },
    queriesToInvalidate: invalidate,
  });

  const [deleteGroup] = PermissionsClient.useDeleteUserGroup({
    onSuccess: () => {
      notifySuccess({ title: "User group deleted" });
    },
    onError: (error: Error) => {
      notifyError({ title: "Delete failed", message: error.message });
    },
    queriesToInvalidate: invalidate,
  });

  const openCreate = (): void => {
    setEditing(null);
    setNameDraft("");
    setColorDraft("#228be6");
    setEditorOpen(true);
  };

  const openEdit = (row: UserGroupRow): void => {
    setEditing(row);
    setNameDraft(row.name);
    setColorDraft(row.color);
    setEditorOpen(true);
  };

  const onSave = (): void => {
    if (!nameDraft.trim()) {
      notifyError({ title: "Name required" });
      return;
    }
    saveGroup({
      workspaceId: workspace.id,
      userGroupId: editing?.id,
      name: nameDraft.trim(),
      color: colorDraft,
    });
  };

  return (
    <Card withBorder p="lg" w="100%" maw="1000px">
      <LoadingOverlay visible={groupsLoading} />
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>User groups</Title>
          <Button size="xs" onClick={openCreate}>
            New user group
          </Button>
        </Group>
        <Text size="sm" c="dimmed">
          Create groups for your workspace members. Datasets and dashboards can
          be configured to only share with (or restrict) certain user groups.
        </Text>
        {groups.map((userGroupRow: UserGroupRow) => {
          return (
            <Group key={userGroupRow.id} justify="space-between">
              <Group gap="xs">
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    backgroundColor: userGroupRow.color,
                  }}
                />
                <Text>{userGroupRow.name}</Text>
              </Group>
              <Group gap="xs">
                <IconEdit
                  size={18}
                  style={{ cursor: "pointer" }}
                  aria-label="Edit user group"
                  onClick={() => {
                    openEdit(userGroupRow);
                  }}
                />
                <IconTrash
                  size={18}
                  style={{ cursor: "pointer" }}
                  aria-label="Delete user group"
                  onClick={() => {
                    modals.openConfirmModal({
                      title: "Delete user group",
                      children:
                        "This removes the user group from members and resources that use it.",
                      labels: { confirm: "Delete", cancel: "Cancel" },
                      confirmProps: { color: "red" },
                      onConfirm: () => {
                        deleteGroup({
                          workspaceId: workspace.id,
                          userGroupId: userGroupRow.id,
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
        title={editing ? "Edit user group" : "New user group"}
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={nameDraft}
            onChange={(e) => {
              setNameDraft(e.currentTarget.value);
            }}
          />
          <ColorInput
            label="Color"
            value={colorDraft}
            onChange={setColorDraft}
          />
          <Button loading={isSaving} onClick={onSave}>
            Save
          </Button>
        </Stack>
      </Modal>
    </Card>
  );
}
