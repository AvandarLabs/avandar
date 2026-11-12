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
