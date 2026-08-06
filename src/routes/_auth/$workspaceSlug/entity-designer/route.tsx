import { createFileRoute } from "@tanstack/react-router";
import { EntityDesignerApp } from "@/views/EntityDesignerApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/entity-designer")({
  component: EntityDesignerApp,
});
