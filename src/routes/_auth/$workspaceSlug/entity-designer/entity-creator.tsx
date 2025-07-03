import { createFileRoute } from "@tanstack/react-router";
import { EntityCreatorView } from "@/components/EntityDesignerApp/EntityCreatorView";

export const Route = createFileRoute("/_auth/$workspaceSlug/entity-designer/entity-creator")({
  component: EntityCreatorView,
});
