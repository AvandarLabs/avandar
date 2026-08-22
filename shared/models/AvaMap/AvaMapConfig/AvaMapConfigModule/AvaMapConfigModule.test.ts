import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";

import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

describe("AvaMapConfig.makeEmpty", () => {
  it("starts with no layers and the avandar basemap", () => {
    const mapConfig = AvaMapConfig.makeEmpty();
    expect(mapConfig.version).toBe(5);
    expect(mapConfig.layers).toEqual([]);
    expect(mapConfig.basemap).toEqual({ type: "builtIn", style: "avandar" });
    expect(mapConfig.view).toEqual(AvaMapConfig.defaultViewState);
  });

  it("starts version 5 maps with no overlay and annotations on top", () => {
    const config = AvaMapConfig.makeEmpty();
    expect(config.version).toBe(5);
    expect(config.aoi).toBeUndefined();
    expect(config.timeRange).toBeUndefined();
    expect(config.annotations).toEqual({ isVisible: true, features: [] });
    expect(config.annotationsZIndex).toBe(0);
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
    const reordered = AvaMapConfig.withStackOrder({
      config,
      orderedLayerIds: [bottom.id, top.id],
    });
    expect(reordered.layers.map(prop("name"))).toEqual(["Top", "Bottom"]);
  });

  it("rejects a row order that is not a permutation of the stack", () => {
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [MapLayer.makeEmpty("Only")],
    };
    expect(() => {
      return AvaMapConfig.withStackOrder({ config, orderedLayerIds: [] });
    }).toThrow("does not match the layers on the map");
  });

  it("returns the same config when the order is unchanged", () => {
    const first = MapLayer.makeEmpty("First");
    const second = MapLayer.makeEmpty("Second");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [first, second],
    };
    expect(
      AvaMapConfig.withStackOrder({
        config,
        orderedLayerIds: [second.id, first.id],
      }),
    ).toBe(config);
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
      AvaMapConfig.withLayerAdded({ config, layer: added }).layers.map(
        prop("name"),
      ),
    ).toEqual(["Existing", "Added"]);
  });

  it("replaces one layer and leaves the others by reference", () => {
    const kept = MapLayer.makeEmpty("Kept");
    const edited = MapLayer.makeEmpty("Edited");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [kept, edited],
    };
    const updatedConfig = AvaMapConfig.withLayerReplaced({
      config,
      layerId: edited.id,
      update: (layer) => {
        return { ...layer, isVisible: false };
      },
    });
    expect(updatedConfig.layers[0]).toBe(kept);
    expect(updatedConfig.layers[1]?.isVisible).toBe(false);
  });

  it("returns the same config when an update changes nothing", () => {
    const layer = MapLayer.makeEmpty("Layer");
    const config = { ...AvaMapConfig.makeEmpty(), layers: [layer] };
    expect(
      AvaMapConfig.withLayerReplaced({
        config,
        layerId: layer.id,
        update: (current) => {
          return current;
        },
      }),
    ).toBe(config);
  });

  it("duplicates a layer directly above the original with a new id", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const config = { ...AvaMapConfig.makeEmpty(), layers: [layer] };
    const updatedConfig = AvaMapConfig.withLayerDuplicated({
      config,
      layerId: layer.id,
      name: "Copy",
    });
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
    expect(
      AvaMapConfig.withLayerRemoved({ config, layerId: dropped.id }).layers,
    ).toEqual([kept]);
  });

  it("keeps a dependent buffer when the source layer is removed", () => {
    const source = MapLayer.makeEmpty("Cases");
    const buffer: MapLayer.T = {
      ...MapLayer.createArea("Buffer of Cases"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: source.id,
        distanceMeters: 1000,
        dissolve: false,
      },
    };
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [source, buffer],
    };

    expect(
      AvaMapConfig.withLayerRemoved({ config, layerId: source.id }).layers,
    ).toEqual([buffer]);
  });
});

describe("bookmarks", () => {
  it("appends a bookmark holding the given camera", () => {
    const config = AvaMapConfig.makeEmpty();
    const view = { center: [29.2, -1.7], zoom: 8 } as const;
    const updatedConfig = AvaMapConfig.withBookmarkAdded({
      config,
      bookmark: AvaMapConfig.makeBookmark({ name: "North Kivu", view }),
    });
    expect(updatedConfig.bookmarks).toHaveLength(1);
    expect(updatedConfig.bookmarks[0]?.view).toEqual(view);
  });

  it("removes a bookmark by id", () => {
    const bookmark = AvaMapConfig.makeBookmark({
      name: "Goma",
      view: AvaMapConfig.defaultViewState,
    });
    const config = AvaMapConfig.withBookmarkAdded({
      config: AvaMapConfig.makeEmpty(),
      bookmark,
    });
    expect(
      AvaMapConfig.withBookmarkRemoved({
        config,
        bookmarkId: bookmark.id,
      }).bookmarks,
    ).toEqual([]);
  });
});
