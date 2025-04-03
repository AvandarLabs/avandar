import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/data-manager/")({
  component: DataManagerRoot,
});

/**
 * This is the default view when we load the data-manager root.
 */
function DataManagerRoot() {
  return <div>No dataset selected</div>;
}
