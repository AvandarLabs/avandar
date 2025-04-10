import { createFileRoute } from "@tanstack/react-router";
import { EntityDesignerApp } from "@/components/EntityDesignerApp/EntityDesignerApp";

export const Route = createFileRoute("/_auth/entity-designer")({
  component: EntityDesignerApp,
});
