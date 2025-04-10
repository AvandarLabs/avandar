import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Logger } from "@/lib/Logger";
import { Callout } from "@/lib/ui/Callout";

export const Route = createFileRoute("/_auth/entity-designer/$entityId")({
  component: RouteComponent,
  loader: async ({ params: { entityId } }): Promise<string> => {
    // TODO(pablo): Implement a real loader
    const entity = await Promise.resolve(entityId);
    if (!entity) {
      throw notFound();
    }
    return entity;
  },
  errorComponent: EntityMetaErrorView,
});

function RouteComponent() {
  const entity = Route.useLoaderData();

  return <div>Hello entity #{entity}!</div>;
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
