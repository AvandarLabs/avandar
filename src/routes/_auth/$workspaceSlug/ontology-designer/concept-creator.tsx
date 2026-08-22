import { createFileRoute } from "@tanstack/react-router";
import { ConceptCreatorView } from "@/views/OntologyDesignerApp/ConceptCreatorView";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/ontology-designer/concept-creator",
)({
  component: ConceptCreatorRouteComponent,
});

function ConceptCreatorRouteComponent(): JSX.Element {
  return (
    <ConceptCreatorStore.Provider>
      <ConceptCreatorView />
    </ConceptCreatorStore.Provider>
  );
}
