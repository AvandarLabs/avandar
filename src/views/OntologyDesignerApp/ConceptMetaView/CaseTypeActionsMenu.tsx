import { ActionIcon } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifySuccess } from "@/utils/notifications/notify";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
};

/**
 * The case type's overflow menu. It holds Delete case type, which asks for
 * confirmation and then returns to the Case Manager home.
 */
export function CaseTypeActionsMenu({ concept }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [deleteCaseType] = ConceptClient.useDelete({
    queriesToInvalidate: [ConceptClient.QueryKeys.getAll()],
    onSuccess: () => {
      navigate(AppLinks.ontologyDesignerHome(workspace.slug));
      notifySuccess({
        title: t`Case type deleted`,
        message: t`${concept.name} deleted successfully`,
      });
    },
  });

  const onDelete = (): void => {
    modals.openConfirmModal({
      title: t`Delete case type`,
      children: (
        <Text>
          <Trans>
            Are you sure you want to delete {concept.name}? This cannot be
            undone.
          </Trans>
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => {
        deleteCaseType({ id: concept.id });
      },
    });
  };

  return (
    <Menu position="bottom-end" width={220}>
      <Menu.Target>
        <ActionIcon
          variant="default"
          color="neutral"
          tooltip={t`More case type actions`}
          aria-label={t`More case type actions`}
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
          <Trans>Delete case type</Trans>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
