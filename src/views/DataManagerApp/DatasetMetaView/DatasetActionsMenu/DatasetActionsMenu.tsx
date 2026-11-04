import { ActionIcon } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { POPOVER_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifySuccess } from "@/utils/notifications/notify";
import { DatasetRefreshMenuItem } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetRefreshMenuItem";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
};

/**
 * The actions that apply to a whole dataset but are not what the user came
 * to do: re-syncing it, and deleting it.
 *
 * Delete lives in this menu rather than as a filled red button at the foot of
 * the page: making the most destructive action the largest and lowest thing
 * on a scrolling page is backwards twice over.
 */
export function DatasetActionsMenu({ dataset }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [deleteDataset, isDeletePending] = DatasetClient.useFullDelete({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
  });

  const onDelete = (): void => {
    modals.openConfirmModal({
      title: t`Delete dataset`,
      children: (
        <Text>
          <Trans>Are you sure you want to delete {dataset.name}?</Trans>
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: {
        color: "danger",
        loading: isDeletePending,
      },
      onConfirm: () => {
        deleteDataset(
          { id: dataset.id },
          {
            onSuccess: () => {
              navigate(AppLinks.dataManagerHome(workspace.slug));
              notifySuccess({
                title: t`Dataset deleted`,
                message: t`${dataset.name} deleted successfully`,
              });
            },
          },
        );
      },
    });
  };

  return (
    <Menu position="bottom-end" width={230} zIndex={POPOVER_Z_INDEX}>
      <Menu.Target>
        <ActionIcon
          variant="default"
          color="neutral"
          tooltip={t`More dataset actions`}
          aria-label={t`More dataset actions`}
        >
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <DatasetRefreshMenuItem dataset={dataset} />
        <Menu.Item
          color="danger"
          leftSection={<IconTrash size={16} />}
          onClick={onDelete}
        >
          <Trans>Delete Dataset</Trans>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
