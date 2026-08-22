import { createFileRoute } from "@tanstack/react-router";
import { OntologyDesignerApp } from "@/views/OntologyDesignerApp";

export const Route = createFileRoute("/_auth/$workspaceSlug/ontology-designer")(
  {
    component: OntologyDesignerApp,
  },
);
