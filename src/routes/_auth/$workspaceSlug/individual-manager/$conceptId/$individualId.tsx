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
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { Logger } from "@/utils/Logger";
import { SingleIndividualView } from "@/views/IndividualManagerApp/SingleIndividualView";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId",
)({
  component: RouteComponent,
  loader: async ({
    params: { individualId, conceptId },
  }): Promise<{ concept: Concept.T; individual: Individual.T }> => {
    const [concept, individual] = await Promise.all([
      ConceptClient.getById({ id: uuid(conceptId) }),
      IndividualClient.getById({ id: uuid(individualId) }),
    ]);
    if (!concept || !individual) {
      throw notFound();
    }
    return {
      concept,
      individual,
    };
  },
  errorComponent: ErrorView,
});

function RouteComponent() {
  const { concept, individual } = Route.useLoaderData();
  return <SingleIndividualView concept={concept} individual={individual} />;
}

function ErrorView({ error }: ErrorComponentProps) {
  const { t } = useLingui();
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <Center h="100%" px="md">
      <Callout
        title={t`This record failed to load`}
        message={t`Try again in a moment, or reach out to support if it keeps happening.`}
      />
    </Center>
  );
}
