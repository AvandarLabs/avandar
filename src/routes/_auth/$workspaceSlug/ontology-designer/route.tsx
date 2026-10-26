import { createFileRoute } from "@tanstack/react-router";
import { appLabel } from "$/copy/appLabel";
import { RouteMiddleware } from "@/utils/RouteMiddleware";
import { OntologyDesignerApp } from "@/views/OntologyDesignerApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/ontology-designer")(
  {
    beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
      permissionKey: "case_types__can_view_case_type",
      appLabel: () => {
        return appLabel("case_types");
      },
    }),
    component: OntologyDesignerApp,
  },
);
