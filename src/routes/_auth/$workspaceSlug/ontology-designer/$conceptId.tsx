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
    <Center h="50%">
      <Callout
        title={t`Profile failed to load`}
        message={t`The profile manager page failed to load. Please try again later or reach out to support.`}
      />
    </Center>
  );
}
