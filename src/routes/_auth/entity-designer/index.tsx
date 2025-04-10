import { Center } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Callout } from "@/lib/ui/Callout";

export const Route = createFileRoute("/_auth/entity-designer/")({
  component: EntityDesignerRoot,
});

/**
 * This is the default view when we load the entity-designer root.
 */
function EntityDesignerRoot() {
  return (
    <Center h="50%">
      <Callout
        title="No entity selected"
        color="info"
        message="Please select an entity from the left sidebar, or create a new one."
      />
    </Center>
  );
}
