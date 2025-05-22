import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { APP_CONFIG } from "@/config/AppConfig";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { ChildRenderOptionsMap } from "@/lib/ui/ObjectDescriptionList/types";
import { hasDefinedProps } from "@/lib/utils/guards";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityConfig } from "@/models/EntityConfig/types";
import { generateEntities } from "./generateEntities";
import { useHydratedEntityConfig } from "./useHydratedEntityConfig";

type Props = {
  entityConfig: EntityConfig;
};

const EXCLUDED_ENTITY_CONFIG_KEYS = ["id", "ownerId", "datasets"] as const;
const ENTITY_CONFIG_RENDER_OPTIONS: ChildRenderOptionsMap<
  EntityConfig<"Full">
> = {
  fields: {
    titleKey: "name",
    excludeKeys: ["id", "entityConfigId"],
    childRenderOptions: {
      options: {
        excludeKeys: ["class"],
      },
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
            onClick={async () => {
              // generate all entities in-browser and in-memory for now
              if (hasDefinedProps(fullEntityConfig, "datasets", "fields")) {
                const newFields = fullEntityConfig.fields.filter((field) => {
                  return hasDefinedProps(field, "valueExtractor");
                });

                // TODO(jpsyx): make this a mutation so you can show a loading
                // spinner by using `isPending`
                await generateEntities({
                  ...fullEntityConfig,
                  fields: newFields,
                });

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
          childRenderOptions={ENTITY_CONFIG_RENDER_OPTIONS}
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
