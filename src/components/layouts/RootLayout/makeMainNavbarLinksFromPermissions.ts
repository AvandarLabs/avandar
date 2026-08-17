import { isDefined } from "@avandar/utils";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";
import type { NavbarLink } from "@/config/NavbarLinks/NavbarLinks";

type MakeMainNavbarLinksInput = {
  workspaceSlug: string;
  canAccessDataSources: boolean;
  canAccessDataExplorer: boolean;
  canAccessDashboards: boolean;
  canAccessMaps: boolean;
  individualManagerLinks: NavbarLink[];
};

/** Builds main workspace navigation links from access permissions. */
export function makeMainNavbarLinksFromPermissions({
  workspaceSlug,
  canAccessDataSources,
  canAccessDataExplorer,
  canAccessDashboards,
  canAccessMaps,
  individualManagerLinks,
}: MakeMainNavbarLinksInput): NavbarLink[] {
  return [
    NavbarLinks.workspaceHome(workspaceSlug),
    canAccessDataSources ? NavbarLinks.dataImport(workspaceSlug) : undefined,
    canAccessDataExplorer ? NavbarLinks.dataExplorer(workspaceSlug) : undefined,
    canAccessDashboards ? NavbarLinks.dashboards(workspaceSlug) : undefined,
    canAccessMaps ? NavbarLinks.map(workspaceSlug) : undefined,
    NavbarLinks.ontologyDesignerHome(workspaceSlug),
    ...individualManagerLinks,
  ].filter(isDefined);
}
