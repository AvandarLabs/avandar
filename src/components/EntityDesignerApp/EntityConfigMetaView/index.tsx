import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { APP_CONFIG } from "@/config/AppConfig";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { FieldRenderOptionsMap } from "@/lib/ui/ObjectDescriptionList/types";
import { hasDefinedProps } from "@/lib/utils/guards";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityConfig } from "@/models/EntityConfig/types";
import { generateEntities } from "./generateEntities";
import { useHydratedEntityConfig } from "./useHydratedEntityConfig";

type Props = {
  entityConfig: EntityConfig;
};

const EXCLUDED_ENTITY_CONFIG_KEYS = ["id", "ownerId", "datasetId"] as const;
const ENTITY_CONFIG_RENDER_OPTIONS: FieldRenderOptionsMap<
  EntityConfig<"Full">
> = {
  dataset: {
    entityFieldOptions: {
      fields: {
        renderAsTable: true,
        excludeKeys: ["id"],
      },
    },
    excludeKeys: ["id", "data"],
  },
  fields: {
    titleKey: "name",
    excludeKeys: ["id", "entityConfigId", "class"],
    entityFieldOptions: {
      valueExtractor: {
        excludeKeys: ["id", "entityFieldConfigId"],
      },
    },
  },
};

export function EntityConfigMetaView({ entityConfig }: Props): JSX.Element {
  const router = useRouter();
  const [sendDelete, isDeletePending] = EntityConfigClient.useDelete({
    invalidateGetAllQuery: true,
  });

  const [fullEntityConfig] = useHydratedEntityConfig({
    entityConfig,
  });

  return (
    <Container pt="lg">
      <Stack>
        <Group>
          <Title order={2}>{entityConfig.name}</Title>
          <Button
            onClick={() => {
              // generate all entities in-browser and in-memory for now
              if (hasDefinedProps(fullEntityConfig, "dataset", "fields")) {
                return generateEntities(fullEntityConfig);
              }
            }}
          >
            Sync data!
          </Button>
        </Group>
        <Text>{entityConfig.description}</Text>

        <ObjectDescriptionList
          entity={fullEntityConfig}
          excludeKeys={EXCLUDED_ENTITY_CONFIG_KEYS}
          entityFieldOptions={ENTITY_CONFIG_RENDER_OPTIONS}
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
                sendDelete(
                  { id: entityConfig.id },
                  {
                    onSuccess: () => {
                      router.navigate({
                        to: APP_CONFIG.links.entityDesigner.to,
                      });

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
    </Container>
  );
}
