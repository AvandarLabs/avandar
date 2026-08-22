import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button, Center } from "@mantine/core";
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from "@tanstack/react-router";

import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { IndividualSelectionEmptyState } from "@/views/IndividualManagerApp/IndividualSelectionEmptyState/IndividualSelectionEmptyState";
import { useConceptIndividuals } from "@/views/IndividualManagerApp/useConceptIndividuals";

const conceptRoute = getRouteApi(
  "/_auth/$workspaceSlug/individual-manager/$conceptId",
);

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/individual-manager/$conceptId/",
)({
  component: IndividualManagerWithNoIndividualSelected,
});

/**
 * Default view when a case type is open but no record is selected.
 */
function IndividualManagerWithNoIndividualSelected(): ReactNode {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const concept = conceptRoute.useLoaderData();
  const { allIndividuals, isLoading } = useConceptIndividuals(concept.id);
  const hasRecords = allIndividuals.length > 0;

  if (isLoading) {
    return null;
  }

  return (
    <Center h="100%" px="md">
      <IndividualSelectionEmptyState
        conceptName={concept.name}
        hasRecords={hasRecords}
        action={
          hasRecords ? undefined : (
            <Button
              size="md"
              variant="light"
              onClick={() => {
                navigate(
                  AppLinks.ontologyDesignerConceptView({
                    workspaceSlug: workspace.slug,
                    conceptId: concept.id,
                    conceptName: concept.name,
                  }),
                );
              }}
            >
              <Trans>Open case type</Trans>
            </Button>
          )
        }
      />
    </Center>
  );
}
