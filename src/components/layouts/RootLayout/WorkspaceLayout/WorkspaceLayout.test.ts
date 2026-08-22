import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";

import { makeMainNavbarLinksFromPermissions } from "@/components/layouts/RootLayout/makeMainNavbarLinksFromPermissions";

describe("workspace navigation permissions", () => {
  it("includes Maps when the user can view maps", () => {
    const links = makeMainNavbarLinksFromPermissions({
      workspaceSlug: "workspace-slug",
      canAccessDataSources: false,
      canAccessDataExplorer: false,
      canAccessDashboards: false,
      canAccessMaps: true,
      individualManagerLinks: [],
    });

    expect(links.map(prop("link.to"))).toContain("/$workspaceSlug/map");
  });

  it("omits Maps when the user cannot view maps", () => {
    const links = makeMainNavbarLinksFromPermissions({
      workspaceSlug: "workspace-slug",
      canAccessDataSources: false,
      canAccessDataExplorer: false,
      canAccessDashboards: false,
      canAccessMaps: false,
      individualManagerLinks: [],
    });

    expect(links.map(prop("link.to"))).not.toContain("/$workspaceSlug/map");
  });
});
