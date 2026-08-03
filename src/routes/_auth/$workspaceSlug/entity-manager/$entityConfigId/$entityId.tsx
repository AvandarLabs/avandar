import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { Callout } from "@ui";
import { uuid } from "$/lib/uuid";
import { useEffect } from "react";
import { EntityClient } from "@/clients/entities/EntityClient";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { Logger } from "@/utils/Logger";
import { SingleEntityView } from "@/views/EntityManagerApp/SingleEntityView";
import type { Entity } from "$/models/entities/Entity/Entity";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/entity-manager/$entityConfigId/$entityId",
)({
  component: RouteComponent,
  loader: async ({
    params: { entityId, entityConfigId },
  }): Promise<{ entityConfig: EntityConfig.T; entity: Entity.T }> => {
    const [entityConfig, entity] = await Promise.all([
      EntityConfigClient.getById({ id: uuid(entityConfigId) }),
      EntityClient.getById({ id: uuid(entityId) }),
    ]);
    if (!entityConfig || !entity) {
      throw notFound();
    }
    return {
      entityConfig,
      entity,
    };
  },
  errorComponent: ErrorView,
});

function RouteComponent() {
  const { entityConfig, entity } = Route.useLoaderData();
  return <SingleEntityView entityConfig={entityConfig} entity={entity} />;
}

function ErrorView({ error }: ErrorComponentProps) {
  const { t } = useLingui();
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <Center h="50%" pt="xxxl">
      <Callout
        title={t`Entity failed to load`}
        message={t`The entity failed to load. Please try again later or reach out to support.`}
      />
    </Center>
  );
}
