import { ActionIcon } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { POPOVER_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { invalidateCrosswalkQueries } from "@/views/DataManagerApp/CrosswalkView/invalidateCrosswalkQueries";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { ReactNode } from "react";

type Props = {
  crosswalk: Crosswalk.T;
  /** The combined dataset's name, when there is one the user can see. */
  combinedDatasetName: string | undefined;
};

/** Returns an opener for the delete confirmation of a crosswalk. */
function useDeleteCrosswalk({
  crosswalk,
  combinedDatasetName,
}: Readonly<Props>): () => void {
  const { t } = useLingui();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspace = useCurrentWorkspace();
  const crosswalkName = crosswalk.name;
  const [deleteCrosswalk] = CrosswalkClient.useDelete({
    onSuccess: () => {
      invalidateCrosswalkQueries(queryClient).catch((error: unknown) => {
        Logger.error(error, {
          devMsg: "Refreshing after a crosswalk delete failed",
        });
      });
      navigate(AppLinks.dataManagerHome(workspace.slug));
      notifySuccess({
        title: t`Crosswalk deleted`,
        message: t`${crosswalkName} was deleted.`,
      });
    },
    onError: () => {
      notifyError(
        t`The crosswalk could not be deleted. Please try again or reach out to support.`,
      );
    },
  });
  return () => {
    modals.openConfirmModal({
      title: t`Delete crosswalk`,
      children: (
        <Text>
          {combinedDatasetName ? (
            <Trans>
              Delete {crosswalkName}? Its mappings are deleted.{" "}
              {combinedDatasetName} stays, but stops updating.
            </Trans>
          ) : (
            <Trans>Delete {crosswalkName}? Its mappings are deleted.</Trans>
          )}
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => {
        deleteCrosswalk({ id: crosswalk.id });
      },
    });
  };
}

/** Actions on a whole crosswalk that are not what someone came to do. */
export function CrosswalkActionsMenu(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const onDelete = useDeleteCrosswalk(props);
  return (
    <Menu position="bottom-end" width={230} zIndex={POPOVER_Z_INDEX}>
      <Menu.Target>
        <ActionIcon
          variant="default"
          color="neutral"
          tooltip={t`More crosswalk actions`}
          aria-label={t`More crosswalk actions`}
        >
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="danger"
          leftSection={<IconTrash size={16} />}
          onClick={onDelete}
        >
          <Trans>Delete crosswalk</Trans>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
