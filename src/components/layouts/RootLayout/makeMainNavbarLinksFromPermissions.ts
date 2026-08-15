import { isDefined } from "@avandar/utils";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";
import type { NavbarLink } from "@/config/NavbarLinks/NavbarLinks";

type MakeMainNavbarLinksInput = {
  workspaceSlug: string;
  canAccessDataSources: boolean;
  canAccessDataExplorer: boolean;
  canAccessDashboards: boolean;
  canAccessMaps: boolean;
  entityManagerLinks: NavbarLink[];
};

/** Builds main workspace navigation links from access permissions. */
export function makeMainNavbarLinksFromPermissions({
  workspaceSlug,
  canAccessDataSources,
  canAccessDataExplorer,
  canAccessDashboards,
  canAccessMaps,
  entityManagerLinks,
}: MakeMainNavbarLinksInput): NavbarLink[] {
  return [
    NavbarLinks.workspaceHome(workspaceSlug),
    canAccessDataSources ? NavbarLinks.dataImport(workspaceSlug) : undefined,
    canAccessDataExplorer ? NavbarLinks.dataExplorer(workspaceSlug) : undefined,
    canAccessDashboards ? NavbarLinks.dashboards(workspaceSlug) : undefined,
    canAccessMaps ? NavbarLinks.map(workspaceSlug) : undefined,
    NavbarLinks.entityDesignerHome(workspaceSlug),
    ...entityManagerLinks,
  ].filter(isDefined);
}
