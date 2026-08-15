import { prop } from "@avandar/utils";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { describe, expect, it } from "vitest";

describe("AvaMapConfig.makeEmpty", () => {
  it("starts with no layers and the avandar basemap", () => {
    const mapConfig = AvaMapConfig.makeEmpty();
    expect(mapConfig.layers).toEqual([]);
    expect(mapConfig.basemap).toEqual({ type: "builtIn", style: "avandar" });
    expect(mapConfig.view).toEqual(AvaMapConfig.defaultViewState);
  });
});

describe("stack order", () => {
  it("lists layers top of the z-order first", () => {
    const bottom = MapLayer.makeEmpty("Bottom");
    const top = MapLayer.makeEmpty("Top");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [bottom, top],
    };
    expect(AvaMapConfig.toStackOrder(config).map(prop("name"))).toEqual([
      "Top",
      "Bottom",
    ]);
  });

  it("reverses a row order back into draw order", () => {
    const bottom = MapLayer.makeEmpty("Bottom");
    const top = MapLayer.makeEmpty("Top");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [bottom, top],
    };
    const reordered = AvaMapConfig.withStackOrder(config, [bottom.id, top.id]);
    expect(reordered.layers.map(prop("name"))).toEqual(["Top", "Bottom"]);
  });

  it("rejects a row order that is not a permutation of the stack", () => {
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [MapLayer.makeEmpty("Only")],
    };
    expect(() => {
      return AvaMapConfig.withStackOrder(config, []);
    }).toThrow("does not match the layers on the map");
  });

  it("returns the same config when the order is unchanged", () => {
    const first = MapLayer.makeEmpty("First");
    const second = MapLayer.makeEmpty("Second");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [first, second],
    };
    expect(AvaMapConfig.withStackOrder(config, [second.id, first.id])).toBe(
      config,
    );
  });
});

describe("layer operations", () => {
  it("adds a new layer at the top of the z-order", () => {
    const existing = MapLayer.makeEmpty("Existing");
    const added = MapLayer.makeEmpty("Added");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [existing],
    };
    expect(
      AvaMapConfig.withLayerAdded(config, added).layers.map(prop("name")),
    ).toEqual(["Existing", "Added"]);
  });

  it("replaces one layer and leaves the others by reference", () => {
    const kept = MapLayer.makeEmpty("Kept");
    const edited = MapLayer.makeEmpty("Edited");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [kept, edited],
    };
    const updatedConfig = AvaMapConfig.withLayerReplaced(
      config,
      edited.id,
      (layer) => {
        return { ...layer, isVisible: false };
      },
    );
    expect(updatedConfig.layers[0]).toBe(kept);
    expect(updatedConfig.layers[1]?.isVisible).toBe(false);
  });

  it("returns the same config when an update changes nothing", () => {
    const layer = MapLayer.makeEmpty("Layer");
    const config = { ...AvaMapConfig.makeEmpty(), layers: [layer] };
    expect(
      AvaMapConfig.withLayerReplaced(config, layer.id, (current) => {
        return current;
      }),
    ).toBe(config);
  });

  it("duplicates a layer directly above the original with a new id", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const config = { ...AvaMapConfig.makeEmpty(), layers: [layer] };
    const updatedConfig = AvaMapConfig.withLayerDuplicated(
      config,
      layer.id,
      "Copy",
    );
    expect(updatedConfig.layers.map(prop("name"))).toEqual(["Cases", "Copy"]);
    expect(updatedConfig.layers[1]?.id).not.toBe(layer.id);
  });

  it("removes a layer by id", () => {
    const kept = MapLayer.makeEmpty("Kept");
    const dropped = MapLayer.makeEmpty("Dropped");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [kept, dropped],
    };
    expect(AvaMapConfig.withLayerRemoved(config, dropped.id).layers).toEqual([
      kept,
    ]);
  });
});

describe("bookmarks", () => {
  it("appends a bookmark holding the given camera", () => {
    const config = AvaMapConfig.makeEmpty();
    const view = { center: [29.2, -1.7], zoom: 8 } as const;
    const updatedConfig = AvaMapConfig.withBookmarkAdded(
      config,
      AvaMapConfig.makeBookmark({ name: "North Kivu", view }),
    );
    expect(updatedConfig.bookmarks).toHaveLength(1);
    expect(updatedConfig.bookmarks[0]?.view).toEqual(view);
  });

  it("removes a bookmark by id", () => {
    const bookmark = AvaMapConfig.makeBookmark({
      name: "Goma",
      view: AvaMapConfig.defaultViewState,
    });
    const config = AvaMapConfig.withBookmarkAdded(
      AvaMapConfig.makeEmpty(),
      bookmark,
    );
    expect(
      AvaMapConfig.withBookmarkRemoved(config, bookmark.id).bookmarks,
    ).toEqual([]);
  });
});
