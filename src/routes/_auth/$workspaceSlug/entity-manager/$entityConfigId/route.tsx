import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { Logger } from "$/lib/Logger/Logger";
import { useEffect } from "react";
import { EntityManagerApp } from "@/components/EntityManagerApp";
import { Callout } from "@/lib/ui/Callout";
import { uuid } from "@/lib/utils/uuid";
import { EntityConfig } from "@/models/EntityConfig/EntityConfig.types";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";

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
