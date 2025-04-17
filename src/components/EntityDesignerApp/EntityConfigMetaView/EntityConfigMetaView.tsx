import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { Logger } from "@/lib/Logger";
import { EntityDescriptionList } from "@/lib/ui/EntityDescriptionList/EntityDescriptionList";
import { EntityConfig } from "@/models/EntityConfig/EntityConfig";

type Props = {
  entityConfig: EntityConfig;
};

const EXCLUDED_ENTITY_CONFIG_KEYS = ["id", "ownerId"] as const;

export function EntityConfigMetaView({ entityConfig }: Props): JSX.Element {
  return (
    <Container pt="lg">
      <Stack>
        <Title order={2}>{entityConfig.name}</Title>
        <Text>{entityConfig.description}</Text>

        <EntityDescriptionList
          entity={entityConfig}
          excludeKeys={EXCLUDED_ENTITY_CONFIG_KEYS}
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
                /*
                loading: isDeletePending,
                */
              },
              onConfirm: () => {
                Logger.log("Delete needs implementing");
                /*
                deleteLocalDataset(entityConfig.id, {
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
                });
                */
              },
            });
          }}
        >
          Delete Dataset
        </Button>
      </Stack>
    </Container>
  );
}
