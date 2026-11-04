import { useLingui } from "@lingui/react/macro";
import { IconListDetails } from "@tabler/icons-react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ReactNode } from "react";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/individual-manager/",
)({
  component: IndividualManagerRootWithNoConceptSelected,
});

/**
 * `/individual-manager` without a case type is not a destination for someone
 * who can view case types: send them to Case Manager, where they pick or
 * create one. Someone with records access only cannot open Case Manager, so
 * they stay here and are pointed at the case types in the sidebar.
 */
function IndividualManagerRootWithNoConceptSelected(): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const canViewCaseType = useHasPermission("case_types__can_view_case_type");

  if (!canViewCaseType) {
    return (
      <AppSlateEmptyState
        icon={<IconListDetails size={32} stroke={1.5} aria-hidden />}
        title={t`Pick a case type`}
        message={t`Choose a case type from the sidebar to see its records.`}
      />
    );
  }

  const home = AppLinks.ontologyDesignerHome(workspace.slug);
  return <Navigate to={home.to} params={home.params} />;
}
