import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Callout } from "@ui";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-manager/")({
  component: DataManagerRoot,
});

/**
 * This is the default view when we load the data-manager root.
 */
function DataManagerRoot() {
  const { t } = useLingui();
  return (
    <Center h="50%" pt="xl">
      <Callout
        title={t`No dataset selected`}
        color="info"
        message={t`Please select a dataset from the left sidebar, or create a new one.`}
      />
    </Center>
  );
}
