import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { uuid } from "$/lib/uuid";
import { useEffect } from "react";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { Logger } from "@/utils/Logger";
import { EntityConfigMetaView } from "@/views/EntityDesignerApp/EntityConfigMetaView";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/entity-designer/$entityConfigId",
)({
  component: RouteComponent,
  loader: async ({ params: { entityConfigId } }): Promise<EntityConfig.T> => {
    const entityConfig = await EntityConfigClient.getById({
      id: uuid(entityConfigId),
    });
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
  const { t } = useLingui();
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <Center h="50%">
      <Callout
        title={t`Profile failed to load`}
        message={t`The profile manager page failed to load. Please try again later or reach out to support.`}
      />
    </Center>
  );
}
