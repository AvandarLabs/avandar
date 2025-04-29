import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { APP_CONFIG } from "@/config/AppConfig";
import { EntityDescriptionList } from "@/lib/ui/EntityDescriptionList";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import { EntityConfig } from "@/models/EntityConfig/types";

type Props = {
  entityConfig: EntityConfig;
};

const EXCLUDED_ENTITY_CONFIG_KEYS = ["id", "ownerId"] as const;

export function EntityConfigMetaView({ entityConfig }: Props): JSX.Element {
  const router = useRouter();
  const [sendDelete, isDeletePending] = EntityConfigClient.useDelete({
    invalidateGetAllQuery: true,
  });

  const [entityFields] = EntityFieldConfigClient.withLogger().useGetAll({
    where: { entity_config_id: { eq: entityConfig.id } },
  });

  const fullEntityConfig = useMemo(() => {
    return {
      ...entityConfig,
      fields: entityFields,
    };
  }, [entityConfig, entityFields]);

  return (
    <Container pt="lg">
      <Stack>
        <Title order={2}>{entityConfig.name}</Title>
        <Text>{entityConfig.description}</Text>

        <EntityDescriptionList
          entity={fullEntityConfig}
          excludeKeys={EXCLUDED_ENTITY_CONFIG_KEYS}
          entityFieldOptions={{
            fields: {
              titleKey: "name",
              excludeKeys: ["id", "entityConfigId", "class"],
            },
          }}
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
