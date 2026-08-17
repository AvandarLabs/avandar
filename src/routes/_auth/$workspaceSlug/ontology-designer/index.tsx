import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/ontology-designer/",
)({
  component: OntologyDesignerRoot,
});

/**
 * This is the default view when we load the ontology-designer root.
 */
function OntologyDesignerRoot() {
  const { t } = useLingui();
  return (
    <Center h="50%">
      <Callout
        title={t`No entity selected`}
        color="info"
        message={t`Please select an entity from the left sidebar, or create a new one.`}
      />
    </Center>
  );
}
