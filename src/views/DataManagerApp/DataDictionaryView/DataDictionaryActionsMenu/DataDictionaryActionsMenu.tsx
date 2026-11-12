import { ActionIcon } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { POPOVER_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
};

/** Returns an opener for the delete confirmation of a dictionary. */
function useDeleteDictionary(dictionary: DataDictionary.T): () => void {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [deleteDictionary] = DataDictionaryClient.useDelete({
    queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
    onSuccess: () => {
      navigate(AppLinks.dataManagerHome(workspace.slug));
      notifySuccess({
        title: t`Dictionary deleted`,
        message: t`${dictionary.name} was deleted.`,
      });
    },
    onError: (error) => {
      notifyError(t`The dictionary could not be deleted: ${error.message}`);
    },
  });

  return () => {
    modals.openConfirmModal({
      title: t`Delete dictionary`,
      children: (
        <Text>
          <Trans>
            Delete {dictionary.name} and all of its entries and code lists?
          </Trans>
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => {
        deleteDictionary({ id: dictionary.id });
      },
    });
  };
}

/** Actions on a whole dictionary that are not what someone came to do. */
export function DataDictionaryActionsMenu({
  dictionary,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const onDelete = useDeleteDictionary(dictionary);

  return (
    <Menu position="bottom-end" width={230} zIndex={POPOVER_Z_INDEX}>
      <Menu.Target>
        <ActionIcon
          variant="default"
          color="neutral"
          tooltip={t`More dictionary actions`}
          aria-label={t`More dictionary actions`}
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
          <Trans>Delete dictionary</Trans>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
