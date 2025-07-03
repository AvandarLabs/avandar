import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { SingleEntityView } from "@/components/EntityManagerApp/SingleEntityView";
import { Logger } from "@/lib/Logger";
import { Callout } from "@/lib/ui/Callout";
import { uuid } from "@/lib/utils/uuid";
import { EntityClient } from "@/models/Entity/EntityClient";
import { Entity } from "@/models/Entity/types";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityConfig } from "@/models/EntityConfig/types";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/entity-manager/$entityConfigId/$entityId",
)({
  component: RouteComponent,
  loader: async ({
    params: { entityId, entityConfigId },
  }): Promise<{ entityConfig: EntityConfig; entity: Entity }> => {
    const [entityConfig, entity] = await Promise.all([
      EntityConfigClient.getById({ id: uuid(entityConfigId) }),
      EntityClient.ofType(uuid(entityConfigId)).getById({ id: uuid(entityId) }),
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
