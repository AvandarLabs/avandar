import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { uuid } from "$/lib/uuid";
import { useEffect } from "react";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { EntityManagerApp } from "@/components/EntityManagerApp";
import { Callout } from "@/lib/ui/Callout";
import { Logger } from "@/utils/Logger";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig.types";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/entity-manager/$entityConfigId",
)({
  component: RouteComponent,
  loader: async ({ params: { entityConfigId } }): Promise<EntityConfig> => {
    const entityConfig = await EntityConfigClient.getById({
      id: uuid(entityConfigId),
    });
    if (!entityConfig) {
      throw notFound();
    }
    return entityConfig;
  },
  errorComponent: ErrorView,
});

function RouteComponent() {
  const entityConfig = Route.useLoaderData();
  return <EntityManagerApp entityConfig={entityConfig} />;
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
