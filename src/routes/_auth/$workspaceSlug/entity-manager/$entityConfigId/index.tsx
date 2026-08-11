import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/entity-manager/$entityConfigId/",
)({
  component: EntityManagerWithNoEntitySelected,
});

/**
 * This is the default view when we load the entity-manager root.
 */
function EntityManagerWithNoEntitySelected() {
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
