import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { uuid } from "$/lib/uuid";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { Logger } from "@/utils/Logger";
import { ConceptMetaView } from "@/views/OntologyDesignerApp/ConceptMetaView";
import type { Concept } from "$/models/ontology/Concept/Concept";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/ontology-designer/$conceptId",
)({
  component: RouteComponent,
  loader: async ({ params: { conceptId } }): Promise<Concept.T> => {
    const concept = await ConceptClient.getById({
      id: uuid(conceptId),
    });
    if (!concept) {
      throw notFound();
    }
    return concept;
  },
  errorComponent: ConceptMetaErrorView,
});

function RouteComponent() {
  const concept = Route.useLoaderData();
  return <ConceptMetaView concept={concept} />;
}

function ConceptMetaErrorView({ error }: ErrorComponentProps) {
  const { t } = useLingui();
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <Center h="100%" px="md">
      <Callout
        title={t`This case type failed to load`}
        message={t`Try again in a moment, or reach out to support if it keeps happening.`}
      />
    </Center>
  );
}
