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
