import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ReactNode } from "react";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/individual-manager/",
)({
  component: IndividualManagerRootWithNoConceptSelected,
});

/**
 * `/individual-manager` without a case type is not a destination. Send the
 * user to Case Manager, where they pick or create one.
 */
function IndividualManagerRootWithNoConceptSelected(): ReactNode {
  const workspace = useCurrentWorkspace();
  const home = AppLinks.ontologyDesignerHome(workspace.slug);
  return <Navigate to={home.to} params={home.params} />;
}
