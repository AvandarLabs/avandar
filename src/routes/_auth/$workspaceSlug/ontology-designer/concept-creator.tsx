import { createFileRoute } from "@tanstack/react-router";
import { appLabel } from "$/copy/appLabel";
import { RouteMiddleware } from "@/utils/RouteMiddleware";
import { ConceptCreatorView } from "@/views/OntologyDesignerApp/ConceptCreatorView";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/ontology-designer/concept-creator",
)({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "case_types__can_create_case_type",
    appLabel: () => {
      return appLabel("case_types");
    },
  }),
  component: ConceptCreatorRouteComponent,
});

function ConceptCreatorRouteComponent(): JSX.Element {
  return (
    <ConceptCreatorStore.Provider>
      <ConceptCreatorView />
    </ConceptCreatorStore.Provider>
  );
}
