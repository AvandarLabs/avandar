import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { makeMainNavbarLinksFromPermissions } from "@/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";

const NO_APP_ACCESS: Parameters<typeof makeMainNavbarLinksFromPermissions>[0] =
  {
    workspaceSlug: "workspace-slug",
    canAccessDataSources: false,
    canAccessDataExplorer: false,
    canAccessDashboards: false,
    canAccessMaps: false,
    canAccessCaseTypes: false,
    canAccessCaseRecords: false,
    individualManagerLinks: [],
  };

const COUNTY_RECORDS_LINK = NavbarLinks.individualManagerHome({
  workspaceSlug: "workspace-slug",
  conceptId: "c1",
  conceptName: "County",
});

describe("workspace navigation permissions", () => {
  it("includes Maps when the user can view maps", () => {
    const links = makeMainNavbarLinksFromPermissions({
      ...NO_APP_ACCESS,
      canAccessMaps: true,
    });

    expect(links.map(prop("link.to"))).toContain("/$workspaceSlug/map");
  });

  it("omits Maps when the user cannot view maps", () => {
    const links = makeMainNavbarLinksFromPermissions(NO_APP_ACCESS);

    expect(links.map(prop("link.to"))).not.toContain("/$workspaceSlug/map");
  });

  it("includes Case Manager when the user can view case types", () => {
    const links = makeMainNavbarLinksFromPermissions({
      ...NO_APP_ACCESS,
      canAccessCaseTypes: true,
    });

    expect(links.map(prop("link.to"))).toContain(
      "/$workspaceSlug/ontology-designer",
    );
  });

  it("omits Case Manager when the user cannot view case types", () => {
    const links = makeMainNavbarLinksFromPermissions(NO_APP_ACCESS);

    expect(links.map(prop("link.to"))).not.toContain(
      "/$workspaceSlug/ontology-designer",
    );
  });

  it("includes each case type's Records link when the user can view records", () => {
    const links = makeMainNavbarLinksFromPermissions({
      ...NO_APP_ACCESS,
      canAccessCaseRecords: true,
      individualManagerLinks: [COUNTY_RECORDS_LINK],
    });

    expect(links).toContain(COUNTY_RECORDS_LINK);
  });

  it("omits every Records link when the user cannot view records", () => {
    const links = makeMainNavbarLinksFromPermissions({
      ...NO_APP_ACCESS,
      individualManagerLinks: [COUNTY_RECORDS_LINK],
    });

    expect(links).not.toContain(COUNTY_RECORDS_LINK);
  });
});
