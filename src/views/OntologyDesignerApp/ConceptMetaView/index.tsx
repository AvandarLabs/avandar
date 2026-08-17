import { ObjectDescriptionList, Paper } from "@avandar/ui";
import { hasDefinedProps } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifySuccess } from "@/utils/notifications/notify";
import { generateIndividuals } from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/index";
import { useHydratedConcept } from "@/views/OntologyDesignerApp/ConceptMetaView/useHydratedConcept";
import type { ObjectKeyRenderOptionsMap } from "@avandar/ui";
import type { Concept } from "$/models/ontology/Concept/Concept";

type Props = {
  concept: Concept.T;
};

const EXCLUDED_ENTITY_CONFIG_KEYS = [
  "id",
  "ownerId",
  "datasets",
  "workspaceId",
] as const;
const ENTITY_CONFIG_RENDER_OPTIONS: ObjectKeyRenderOptionsMap<
  Concept.T<"Full">
> = {
  attributes: {
    titleKey: "name",
    defaultExpanded: false,
    itemRenderOptions: {
      excludeKeys: ["id", "conceptId"],
      keyRenderOptions: {
        mapping: {
          excludeKeys: ["id", "conceptAttributeId"],
        },
      },
    },
  },
};

export function ConceptMetaView({ concept }: Props): JSX.Element {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [sendDelete, isDeletePending] = ConceptClient.useDelete({
    queriesToInvalidate: [ConceptClient.QueryKeys.getAll()],
  });
  const [isGeneratingIndividuals, setIsGeneratingIndividuals] = useState(false);

  const [fullConcept] = useHydratedConcept({
    concept,
  });

  return (
    <Container pt="lg">
      <Paper>
        <Stack>
          <Group>
            <Title order={2}>{concept.name}</Title>
            <Button
              loading={isGeneratingIndividuals}
              onClick={async () => {
                // generate all individuals in-browser and in-memory for now
                if (hasDefinedProps(fullConcept, ["datasets", "attributes"])) {
                  const newAttributes = fullConcept.attributes.filter(
                    (attribute) => {
                      return hasDefinedProps(attribute, "mapping");
                    },
                  );

                  // TODO(jpsyx): make this a mutation so you can show a loading
                  // spinner by using `isPending`
                  setIsGeneratingIndividuals(true);
                  await generateIndividuals({
                    ...fullConcept,
                    attributes: newAttributes,
                  });
                  setIsGeneratingIndividuals(false);

                  notifySuccess(t`Finished syncing ${concept.name} data`);
                } else {
                  notifications.show({
                    title: t`Cannot sync this entity`,
                    message: t`No fields or dataset are configured.`,
                    color: "red",
                  });
                }
              }}
            >
              <Trans>Sync data!</Trans>
            </Button>
          </Group>
          <Text>{concept.description}</Text>

          <ObjectDescriptionList
            data={fullConcept}
            excludeKeys={EXCLUDED_ENTITY_CONFIG_KEYS}
            keyRenderOptions={ENTITY_CONFIG_RENDER_OPTIONS}
          />

          <Button
            color="danger"
            onClick={() => {
              modals.openConfirmModal({
                title: t`Delete entity`,
                children: (
                  <Text>
                    <Trans>
                      Are you sure you want to delete {concept.name}?
                    </Trans>
                  </Text>
                ),
                labels: { confirm: t`Delete`, cancel: t`Cancel` },
                confirmProps: {
                  color: "danger",
                  loading: isDeletePending,
                },
                onConfirm: () => {
                  // TODO(ipsyx): if we delete a concept, we should delete
                  // any individuals, and the datasets generated for them,
                  // that are associated to it
                  sendDelete(
                    { id: concept.id },
                    {
                      onSuccess: () => {
                        navigate(AppLinks.ontologyDesignerHome(workspace.slug));

                        notifications.show({
                          title: t`Entity deleted`,
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
            <Trans>Delete Entity</Trans>
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
