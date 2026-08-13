import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { propNotEq } from "@avandar/utils";
import { useState } from "react";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLinks } from "@/config/AppLinks";
import { notifyError } from "@/utils/notifications/notify";
import styles from "./WorkspaceSettingsPage.module.css";
import type { Workspace } from "$/models/Workspace/Workspace";

type Props = {
  workspace: Workspace.WithSubscription;
};

/**
 * The "danger zone" of the workspace settings General tab: an owner-only
 * card that permanently deletes the workspace after a name confirmation.
 * This lives on its own because the delete flow carries its own mutation,
 * modal state, and confirmation input that the workspace-name form does
 * not care about.
 */
export function WorkspaceDangerZone({ workspace }: Props): JSX.Element {
  const { t } = useLingui();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const [deleteWorkspace, isDeletingWorkspace] =
    WorkspaceClient.useDeleteWorkspace({
      onSuccess: () => {
        queryClient.setQueryData<Workspace.WithSubscription[]>(
          WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser(),
          (prevWorkspaces) => {
            return prevWorkspaces?.filter(propNotEq("id", workspace.id)) ?? [];
          },
        );
        void navigate({ to: AppLinks.home.to });
      },
      onError: (error: Error) => {
        notifyError({
          title: t`Failed to delete workspace`,
          message: error.message,
        });
      },
    });

  const closeDeleteModal = (): void => {
    setIsDeleteModalOpen(false);
    setDeleteConfirmName("");
  };

  return (
    <Box>
      <Divider />
      <Card withBorder mt="xl" className={styles.dangerCard}>
        <Group justify="space-between" align="center">
          <Box>
            <Text fw={500}>
              <Trans>Delete this workspace</Trans>
            </Text>
            <Text size="sm" c="dimmed">
              <Trans>
                Permanently deletes this workspace and all of its data. This
                action cannot be undone.
              </Trans>
            </Text>
          </Box>
          <Button
            color="red"
            variant="outline"
            onClick={() => {
              setIsDeleteModalOpen(true);
            }}
          >
            <Trans>Delete workspace</Trans>
          </Button>
        </Group>
      </Card>
      <Modal
        opened={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title={t`Delete workspace`}
      >
        <Stack gap="md">
          <Text size="sm">
            <Trans>
              This will permanently delete <strong>{workspace.name}</strong> and
              all of its data. This action cannot be undone.
            </Trans>
          </Text>
          <TextInput
            label={t`Type the workspace name to confirm`}
            placeholder={workspace.name}
            value={deleteConfirmName}
            onChange={(e) => {
              setDeleteConfirmName(e.currentTarget.value);
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteModal}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              color="red"
              disabled={deleteConfirmName.trim() !== workspace.name}
              loading={isDeletingWorkspace}
              onClick={() => {
                deleteWorkspace({ workspaceId: workspace.id });
              }}
            >
              <Trans>Delete workspace</Trans>
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
