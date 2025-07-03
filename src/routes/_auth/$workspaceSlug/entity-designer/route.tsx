import { createFileRoute } from "@tanstack/react-router";
import { EntityDesignerApp } from "@/components/EntityDesignerApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/entity-designer")({
  component: EntityDesignerApp,
});
