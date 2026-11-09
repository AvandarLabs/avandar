import { isDefined } from "@avandar/utils";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";
import type { NavbarLink } from "@/config/NavbarLinks/NavbarLinks";

type MakeMainNavbarLinksInput = {
  workspaceSlug: string;
  canAccessDataSources: boolean;
  canAccessDataExplorer: boolean;
  canAccessDashboards: boolean;
  canAccessMaps: boolean;
  canAccessCaseTypes: boolean;
  canAccessCaseRecords: boolean;
  individualManagerLinks: NavbarLink[];
};

/** Builds main workspace navigation links from access permissions. */
export function makeMainNavbarLinksFromPermissions({
  workspaceSlug,
  canAccessDataSources,
  canAccessDataExplorer,
  canAccessDashboards,
  canAccessMaps,
  canAccessCaseTypes,
  canAccessCaseRecords,
  individualManagerLinks,
}: MakeMainNavbarLinksInput): NavbarLink[] {
  return [
    NavbarLinks.workspaceHome(workspaceSlug),
    canAccessDataSources ? NavbarLinks.dataImport(workspaceSlug) : undefined,
    canAccessDataExplorer ? NavbarLinks.dataExplorer(workspaceSlug) : undefined,
    canAccessDashboards ? NavbarLinks.dashboards(workspaceSlug) : undefined,
    canAccessMaps ? NavbarLinks.map(workspaceSlug) : undefined,
    canAccessCaseTypes
      ? NavbarLinks.ontologyDesignerHome(workspaceSlug)
      : undefined,
    ...(canAccessCaseRecords
      ? [NavbarLinks.assignedToMe(workspaceSlug), ...individualManagerLinks]
      : []),
  ].filter(isDefined);
}
