import { describe, expect, it } from "vitest";
import { AppLinks } from "@/config/AppLinks/AppLinks";

describe("AppLinks map destinations", () => {
  it("exposes both the map directory and an individual map editor link", () => {
    const mapLink = AppLinks.map("workspace-slug");
    const mapEditorLink = AppLinks.mapEditor({
      workspaceSlug: "workspace-slug",
      mapId: "map-id",
    });

    expect(mapLink).toMatchObject({
      to: "/$workspaceSlug/map",
      params: { workspaceSlug: "workspace-slug" },
    });
    expect(mapLink.label()).toBe("Maps");
    expect(mapEditorLink).toMatchObject({
      to: "/$workspaceSlug/map/$mapId",
      params: { workspaceSlug: "workspace-slug", mapId: "map-id" },
    });
    expect(mapEditorLink.label()).toBe("Map");
  });
});

describe("AppLinks learn-a-dictionary destination", () => {
  it("points at the create route and works offline", () => {
    const link = AppLinks.dataManagerNewDictionary("workspace-slug");

    expect(link).toMatchObject({
      to: "/$workspaceSlug/data-manager/dictionaries/new",
      params: { workspaceSlug: "workspace-slug" },
      isAvailableOffline: true,
    });
    expect(link.label()).toBe("New dictionary");
  });
});

describe("AppLinks crosswalk destinations", () => {
  it("points New crosswalk at the create route and works offline", () => {
    const link = AppLinks.dataManagerNewCrosswalk("workspace-slug");

    expect(link).toMatchObject({
      key: "data-manager-new-crosswalk",
      to: "/$workspaceSlug/data-manager/crosswalks/new",
      params: { workspaceSlug: "workspace-slug" },
      isAvailableOffline: true,
    });
    expect(link.label()).toBe("New crosswalk");
  });

  it("opens a crosswalk at a step and layout, labelled with its name", () => {
    const link = AppLinks.dataManagerCrosswalkView({
      workspaceSlug: "workspace-slug",
      crosswalkId: "crosswalk-id",
      crosswalkName: "Measles line lists",
      step: "map",
      layoutId: "layout-id",
    });

    expect(link).toMatchObject({
      key: "data-manager-crosswalk-view",
      to: "/$workspaceSlug/data-manager/crosswalks/$crosswalkId",
      params: { workspaceSlug: "workspace-slug", crosswalkId: "crosswalk-id" },
      search: { step: "map", layoutId: "layout-id" },
      isAvailableOffline: true,
    });
    expect(link.label()).toBe("Measles line lists");
  });

  it("leaves the step and layout out when none are given", () => {
    const link = AppLinks.dataManagerCrosswalkView({
      workspaceSlug: "workspace-slug",
      crosswalkId: "crosswalk-id",
      crosswalkName: "Measles line lists",
    });

    expect(link.search).toEqual({ step: undefined, layoutId: undefined });
  });
});
