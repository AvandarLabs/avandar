import { createFileRoute } from "@tanstack/react-router";
import { EntityCreator } from "@/components/EntityDesignerApp/EntityCreatorView";

export const Route = createFileRoute("/_auth/entity-designer/entity-creator")({
  component: EntityCreator,
});
