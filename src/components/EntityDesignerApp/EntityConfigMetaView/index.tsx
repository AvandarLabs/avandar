import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { ObjectKeyRenderOptionsMap } from "@/lib/ui/ObjectDescriptionList/ObjectDescriptionList.types";
import { Paper } from "@/lib/ui/Paper";
import { hasDefinedProps } from "@/lib/utils/guards/guards";
import { EntityConfig } from "@/models/EntityConfig/EntityConfig.types";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { generateEntities } from "./generateEntities";
import { useHydratedEntityConfig } from "./useHydratedEntityConfig";

type Props = {
  entityConfig: EntityConfig;
};

const EXCLUDED_ENTITY_CONFIG_KEYS = [
  "id",
  "ownerId",
  "datasets",
  "workspaceId",
] as const;
const ENTITY_CONFIG_RENDER_OPTIONS: ObjectKeyRenderOptionsMap<
  EntityConfig<"Full">
> = {
  fields: {
    titleKey: "name",
    defaultExpanded: false,
    itemRenderOptions: {
      excludeKeys: ["id", "entityConfigId"],
      keyRenderOptions: {
        options: {
          excludeKeys: ["class"],
        },
        valueExtractor: {
          excludeKeys: ["id", "entityFieldConfigId"],
        },
      },
    },
  },
};

export function EntityConfigMetaView({ entityConfig }: Props): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [sendDelete, isDeletePending] = EntityConfigClient.useDelete({
    queriesToInvalidate: [EntityConfigClient.QueryKeys.getAll()],
  });
  const [isGeneratingEntities, setIsGeneratingEntities] = useState(false);

  const [fullEntityConfig] = useHydratedEntityConfig({
    entityConfig,
  });

  return (
    <Container pt="lg">
      <Paper>
        <Stack>
          <Group>
            <Title order={2}>{entityConfig.name}</Title>
            <Button
              loading={isGeneratingEntities}
              onClick={async () => {
                // generate all entities in-browser and in-memory for now
                if (hasDefinedProps(fullEntityConfig, ["datasets", "fields"])) {
                  const newFields = fullEntityConfig.fields.filter((field) => {
                    return hasDefinedProps(field, "valueExtractor");
                  });

                  // TODO(jpsyx): make this a mutation so you can show a loading
                  // spinner by using `isPending`
                  setIsGeneratingEntities(true);
                  await generateEntities({
                    ...fullEntityConfig,
                    fields: newFields,
                  });
                  setIsGeneratingEntities(false);

                  notifications.show({
                    title: "Entities generated",
                    message: "Entities generated successfully",
                    color: "green",
                  });
                } else {
                  notifications.show({
                    title: "Cannot sync this entity",
                    message: "No fields or dataset are configured.",
                    color: "red",
                  });
                }
              }}
            >
              Sync data!
            </Button>
          </Group>
          <Text>{entityConfig.description}</Text>

          <ObjectDescriptionList
            data={fullEntityConfig}
            excludeKeys={EXCLUDED_ENTITY_CONFIG_KEYS}
            keyRenderOptions={ENTITY_CONFIG_RENDER_OPTIONS}
          />

          <Button
            color="danger"
            onClick={() => {
              modals.openConfirmModal({
                title: "Delete entity",
                children: (
                  <Text>
                    Are you sure you want to delete {entityConfig.name}?
                  </Text>
                ),
                labels: { confirm: "Delete", cancel: "Cancel" },
                confirmProps: {
                  color: "danger",
                  loading: isDeletePending,
                },
                onConfirm: () => {
                  // TODO(ipsyx): if we delete an entity config,
                  // we should delete any entities (and their entities datasets)
                  // that are associated to it
                  sendDelete(
                    { id: entityConfig.id },
                    {
                      onSuccess: () => {
                        navigate(AppLinks.entityDesignerHome(workspace.slug));

                        notifications.show({
                          title: "Entity deleted",
                          message: `${entityConfig.name} deleted successfully`,
                          color: "green",
                        });
                      },
                    },
                  );
                },
              });
            }}
          >
            Delete Entity
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
