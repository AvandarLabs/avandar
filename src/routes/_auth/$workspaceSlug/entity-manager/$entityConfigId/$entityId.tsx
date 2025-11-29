import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { Logger } from "$/lib/Logger/Logger";
import { useEffect } from "react";
import { EntityClient } from "@/clients/entities/EntityClient";
import { SingleEntityView } from "@/components/EntityManagerApp/SingleEntityView";
import { Callout } from "@/lib/ui/Callout";
import { uuid } from "@/lib/utils/uuid";
import { Entity } from "@/models/entities/Entity";
import { EntityConfig } from "@/models/EntityConfig/EntityConfig.types";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/entity-manager/$entityConfigId/$entityId",
)({
  component: RouteComponent,
  loader: async ({
    params: { entityId, entityConfigId },
  }): Promise<{ entityConfig: EntityConfig; entity: Entity }> => {
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
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <Center h="50%">
      <Callout
        title="Entity failed to load"
        message="The entity failed to load. Please try again later or reach out to support."
      />
    </Center>
  );
}
