import { Center } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Callout } from "@/lib/ui/Callout";

export const Route = createFileRoute("/_auth/$workspaceSlug/data-manager/")({
  component: DataManagerRoot,
});

/**
 * This is the default view when we load the data-manager root.
 */
function DataManagerRoot() {
  return (
    <Center h="50%" pt="xl">
      <Callout
        title="No dataset selected"
        color="info"
        message="Please select a dataset from the left sidebar, or create a new one."
      />
    </Center>
  );
}
