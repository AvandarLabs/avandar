import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

import { hasDefinedProps } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifySuccess } from "@/utils/notifications/notify";
import { generateIndividuals } from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/index";
import { ViewRecordsButton } from "@/views/OntologyDesignerApp/ConceptMetaView/ViewRecordsButton";

type Props = {
  concept: Concept.T;
  fullConcept: Concept.T<"Full">;
};

/**
 * Sync and delete actions for a case type.
 */
export function CaseTypeActions({ concept, fullConcept }: Props): ReactNode {
  return (
    <Group gap="xs" wrap="nowrap">
      <ViewRecordsButton concept={concept} />
      <SyncRecordsButton concept={concept} fullConcept={fullConcept} />
      <DeleteCaseTypeButton concept={concept} />
    </Group>
  );
}

function SyncRecordsButton({ concept, fullConcept }: Props): ReactNode {
  const { t } = useLingui();
  const [isGeneratingIndividuals, setIsGeneratingIndividuals] = useState(false);

  return (
    <Button
      variant="light"
      size="compact-sm"
      loading={isGeneratingIndividuals}
      onClick={async () => {
        if (!hasDefinedProps(fullConcept, ["datasets", "attributes"])) {
          notifications.show({
            title: t`Cannot sync this case type`,
            message: t`No attributes or dataset are configured.`,
            color: "red",
          });
          return;
        }
        const mappedAttributes = fullConcept.attributes.filter((attribute) => {
          return hasDefinedProps(attribute, "mapping");
        });
        setIsGeneratingIndividuals(true);
        try {
          await generateIndividuals({
            ...fullConcept,
            attributes: mappedAttributes,
          });
          notifySuccess(t`Finished syncing ${concept.name} records`);
        } catch (error) {
          // Without this the button spins forever on any failure: the loading
          // flag was only cleared on the success path, so a rejected sync left
          // it stuck and reported nothing at all.
          Logger.error(error, { msg: "Failed to sync case type records" });
          notifications.show({
            title: t`Could not sync ${concept.name} records`,
            message:
              error instanceof Error
                ? error.message
                : t`An unexpected error occurred.`,
            color: "red",
          });
        } finally {
          setIsGeneratingIndividuals(false);
        }
      }}
    >
      <Trans>Sync records</Trans>
    </Button>
  );
}

function DeleteCaseTypeButton({ concept }: { concept: Concept.T }): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [sendDelete, isDeletePending] = ConceptClient.useDelete({
    queriesToInvalidate: [ConceptClient.QueryKeys.getAll()],
  });

  return (
    <Button
      size="compact-sm"
      color="danger"
      variant="subtle"
      loading={isDeletePending}
      onClick={() => {
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
            sendDelete(
              { id: concept.id },
              {
                onSuccess: () => {
                  navigate(AppLinks.ontologyDesignerHome(workspace.slug));
                  notifications.show({
                    title: t`Case type deleted`,
                    message: t`${concept.name} deleted successfully`,
                    color: "green",
                  });
                },
              },
            );
          },
        });
      }}
    >
      <Trans>Delete</Trans>
    </Button>
  );
}
