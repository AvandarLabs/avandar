import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { mapViewerCameraToViewState } from "@/views/GisApp/MapViewer/mapViewerCameraToViewState/mapViewerCameraToViewState";

const BRONX_VIEW = { center: [-73.86, 40.84] as [number, number], zoom: 12 };
const BOOKMARK = AvaMapConfig.makeBookmark({ name: "Bronx", view: BRONX_VIEW });
const CONFIG = { ...AvaMapConfig.makeEmpty(), bookmarks: [BOOKMARK] };

describe("mapViewerCameraToViewState", () => {
  it("opens on the saved view", () => {
    expect(
      mapViewerCameraToViewState({ camera: { type: "saved" }, config: CONFIG }),
    ).toEqual(CONFIG.view);
  });

  it("opens on a bookmark's view", () => {
    expect(
      mapViewerCameraToViewState({
        camera: { type: "bookmark", bookmarkId: BOOKMARK.id },
        config: CONFIG,
      }),
    ).toEqual(BRONX_VIEW);
  });

  it("falls back to the saved view when the bookmark was deleted", () => {
    expect(
      mapViewerCameraToViewState({
        camera: { type: "bookmark", bookmarkId: BOOKMARK.id },
        config: { ...CONFIG, bookmarks: [] },
      }),
    ).toEqual(CONFIG.view);
  });
});
