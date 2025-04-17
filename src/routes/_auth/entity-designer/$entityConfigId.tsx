import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { EntityConfigMetaView } from "@/components/EntityDesignerApp/EntityConfigMetaView/EntityConfigMetaView";
import { Logger } from "@/lib/Logger";
import { Callout } from "@/lib/ui/Callout";
import { uuid } from "@/lib/utils/uuid";
import { EntityConfig } from "@/models/EntityConfig/EntityConfig";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";

export const Route = createFileRoute("/_auth/entity-designer/$entityConfigId")({
  component: RouteComponent,
  loader: async ({ params: { entityConfigId } }): Promise<EntityConfig> => {
    const entityConfig = await EntityConfigClient.getById(uuid(entityConfigId));
    if (!entityConfig) {
      throw notFound();
    }
    return entityConfig;
  },
  errorComponent: EntityMetaErrorView,
});

function RouteComponent() {
  const entityConfig = Route.useLoaderData();
  return <EntityConfigMetaView entityConfig={entityConfig} />;
}

function EntityMetaErrorView({ error }: ErrorComponentProps) {
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
