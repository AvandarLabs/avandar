import { createFileRoute } from "@tanstack/react-router";
import { EntityConfigCreatorView } from "@/views/EntityDesignerApp/EntityConfigCreatorView";
import { EntityConfigCreatorStore } from "@/views/EntityDesignerApp/EntityConfigCreatorView/EntityConfigCreatorStore";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/entity-designer/entity-creator",
)({
  component: EntityConfigCreatorRouteComponent,
});

function EntityConfigCreatorRouteComponent(): JSX.Element {
  return (
    <EntityConfigCreatorStore.Provider>
      <EntityConfigCreatorView />
    </EntityConfigCreatorStore.Provider>
  );
}
