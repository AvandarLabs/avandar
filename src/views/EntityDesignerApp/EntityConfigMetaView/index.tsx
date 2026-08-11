import { ObjectDescriptionList, Paper } from "@avandar/ui";
import { hasDefinedProps } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifySuccess } from "@/utils/notifications/notify";
import { generateEntities } from "@/views/EntityDesignerApp/EntityConfigMetaView/generateEntities/index";
import { useHydratedEntityConfig } from "@/views/EntityDesignerApp/EntityConfigMetaView/useHydratedEntityConfig";
import type { ObjectKeyRenderOptionsMap } from "@avandar/ui";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig";

type Props = {
  entityConfig: EntityConfig.T;
};

const EXCLUDED_ENTITY_CONFIG_KEYS = [
  "id",
  "ownerId",
  "datasets",
  "workspaceId",
] as const;
const ENTITY_CONFIG_RENDER_OPTIONS: ObjectKeyRenderOptionsMap<
  EntityConfig.T<"Full">
> = {
  fields: {
    titleKey: "name",
    defaultExpanded: false,
    itemRenderOptions: {
      excludeKeys: ["id", "entityConfigId"],
      keyRenderOptions: {
        valueExtractor: {
          excludeKeys: ["id", "entityFieldConfigId"],
        },
      },
    },
  },
};

export function EntityConfigMetaView({ entityConfig }: Props): JSX.Element {
  const { t } = useLingui();
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

                  notifySuccess(t`Finished syncing ${entityConfig.name} data`);
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
                title: t`Delete entity`,
                children: (
                  <Text>
                    <Trans>
                      Are you sure you want to delete {entityConfig.name}?
                    </Trans>
                  </Text>
                ),
                labels: { confirm: t`Delete`, cancel: t`Cancel` },
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
                          title: t`Entity deleted`,
                          message: t`${entityConfig.name} deleted successfully`,
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
