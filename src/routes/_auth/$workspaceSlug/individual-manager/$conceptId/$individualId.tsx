import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import {
  createFileRoute,
  ErrorComponentProps,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { uuid } from "$/lib/uuid";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { Logger } from "@/utils/Logger";
import { DetailPaneMessage } from "@/views/IndividualManagerApp/DetailPaneMessage/DetailPaneMessage";
import { SingleIndividualView } from "@/views/IndividualManagerApp/SingleIndividualView";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";

/**
 * `comment` names a comment to scroll to and highlight, set by a copied
 * comment link. A malformed id is dropped rather than failing the page.
 */
const RecordSearchSchema = z.object({
  comment: z.uuid().optional().catch(undefined),
});

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId",
)({
  component: RouteComponent,
  validateSearch: RecordSearchSchema,
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
  const { comment } = Route.useSearch();

  // Keyed by record so picking another record resets the feed's scroll
  // memory and the composer.
  return (
    <SingleIndividualView
      key={individual.id}
      concept={concept}
      individual={individual}
      highlightedCommentId={comment}
    />
  );
}

function ErrorView({ error }: ErrorComponentProps) {
  const { t } = useLingui();
  useEffect(() => {
    Logger.error(error);
  }, [error]);

  return (
    <DetailPaneMessage>
      <Callout
        title={t`This record failed to load`}
        message={t`Try again in a moment, or reach out to support if it keeps happening.`}
      />
    </DetailPaneMessage>
  );
}
