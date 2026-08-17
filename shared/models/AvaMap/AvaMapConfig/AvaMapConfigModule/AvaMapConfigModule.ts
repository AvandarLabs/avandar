import { Model } from "@avandar/models";
import { makeSet, prop, propEq, propNotEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import type {
  AvaMapConfigRead,
  MapBookmark,
  MapBookmarkId,
  MapViewState,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/** Opening camera position when a map has no data to fit yet. */
const DEFAULT_MAP_VIEW_STATE: MapViewState = {
  center: [-74.006, 40.7128],
  zoom: 10,
};

/** True when both id lists hold the same ids, in any order. */
function _haveSameIds(
  options: Readonly<{
    first: readonly MapLayer.Id[];
    second: readonly MapLayer.Id[];
  }>,
): boolean {
  const { first, second } = options;
  const firstSet = makeSet(first);
  const secondSet = makeSet(second);
  return (
    first.length === second.length &&
    firstSet.size === secondSet.size &&
    second.every((id) => {
      return firstSet.has(id);
    })
  );
}

/** Constructors, defaults, and immutable updates for map configuration. */
export const AvaMapConfigModule = {
  /** Opening camera position when a map has no data to fit yet. */
  defaultViewState: DEFAULT_MAP_VIEW_STATE,

  /** A new, empty config with the default basemap and camera and no layers. */
  makeEmpty: (): AvaMapConfigRead => {
    return Model.make("AvaMapConfig", {
      version: 3,
      basemap: { type: "builtIn", style: "avandar" },
      view: DEFAULT_MAP_VIEW_STATE,
      bookmarks: [],
      layers: [],
    } as const);
  },

  /**
   * The layers in the order the layer panel lists them: top of the z-order
   * first. `layers` is stored bottom to top because that is MapLibre's draw
   * order, and the panel reads top down because that is what a reader of a map
   * sees first.
   * @param config The map whose stack is being listed.
   */
  toStackOrder: (config: AvaMapConfigRead): MapLayer.T[] => {
    return [...config.layers].reverse();
  },

  /**
   * Reorders the stack from a panel row order, top of the z-order first.
   *
   * @param config The map being reordered.
   * @param orderedLayerIds Every layer id, in panel row order.
   * @returns The reordered config, or `config` when the order is unchanged.
   * @throws When `orderedLayerIds` is not a permutation of the map's layers,
   * which would silently drop or duplicate a layer.
   */
  withStackOrder: (
    options: Readonly<{
      config: AvaMapConfigRead;
      orderedLayerIds: readonly MapLayer.Id[];
    }>,
  ): AvaMapConfigRead => {
    const { config, orderedLayerIds } = options;
    const currentIds = config.layers.map(prop("id"));
    if (!_haveSameIds({ first: currentIds, second: orderedLayerIds })) {
      throw new Error(
        "The requested layer order does not match the layers on the map.",
      );
    }
    const nextLayers = [...orderedLayerIds].reverse().map((layerId) => {
      return config.layers.find(propEq("id", layerId))!;
    });
    const isUnchanged =
      nextLayers.length === config.layers.length &&
      nextLayers.every((layer, layerIndex) => {
        return layer === config.layers[layerIndex];
      });
    return isUnchanged ? config : { ...config, layers: nextLayers };
  },

  /** Adds a layer at the top of the z-order, which is the first panel row. */
  withLayerAdded: (
    options: Readonly<{ config: AvaMapConfigRead; layer: MapLayer.T }>,
  ): AvaMapConfigRead => {
    const { config, layer } = options;
    return { ...config, layers: [...config.layers, layer] };
  },

  /** Removes a layer by id. Unknown ids leave the config untouched. */
  withLayerRemoved: (
    options: Readonly<{ config: AvaMapConfigRead; layerId: MapLayer.Id }>,
  ): AvaMapConfigRead => {
    const { config, layerId } = options;
    const nextLayers = config.layers.filter(propNotEq("id", layerId));
    return nextLayers.length === config.layers.length ?
        config
      : { ...config, layers: nextLayers };
  },

  /**
   * Applies an immutable update to one layer.
   * @param config The map holding the layer.
   * @param layerId Which layer to update.
   * @param update Receives the current layer and returns the next one. Return
   * the layer it was given to signal "nothing changed".
   */
  withLayerReplaced: (
    options: Readonly<{
      config: AvaMapConfigRead;
      layerId: MapLayer.Id;
      update: (current: MapLayer.T) => MapLayer.T;
    }>,
  ): AvaMapConfigRead => {
    const { config, layerId, update } = options;
    const currentLayer = config.layers.find(propEq("id", layerId));
    if (!currentLayer) {
      return config;
    }
    const nextLayer = update(currentLayer);
    if (nextLayer === currentLayer) {
      return config;
    }
    return {
      ...config,
      layers: config.layers.map((layer) => {
        return layer.id === layerId ? nextLayer : layer;
      }),
    };
  },

  /**
   * Copies a layer directly above the original, with a fresh id so the two
   * render as separate MapLibre layers.
   * @param name The copy's display name, already localized by the caller.
   */
  withLayerDuplicated: (
    options: Readonly<{
      config: AvaMapConfigRead;
      layerId: MapLayer.Id;
      name: string;
    }>,
  ): AvaMapConfigRead => {
    const { config, layerId, name } = options;
    const sourceIndex = config.layers.findIndex(propEq("id", layerId));
    const sourceLayer = config.layers[sourceIndex];
    if (!sourceLayer) {
      return config;
    }
    const copy: MapLayer.T = {
      ...sourceLayer,
      id: uuid<MapLayer.Id>(),
      name,
      legend: { ...sourceLayer.legend, title: name },
    };
    const nextLayers = [...config.layers];
    nextLayers.splice(sourceIndex + 1, 0, copy);
    return { ...config, layers: nextLayers };
  },

  /**
   * A bookmark for the given camera position.
   * @param params.name The bookmark's display name, already localized.
   */
  makeBookmark: (
    params: Readonly<{
      name: string;
      view: {
        center: readonly [longitude: number, latitude: number];
        zoom: number;
      };
    }>,
  ): MapBookmark => {
    return {
      id: uuid<MapBookmarkId>(),
      name: params.name,
      view: {
        center: [params.view.center[0], params.view.center[1]],
        zoom: params.view.zoom,
      },
    };
  },

  /** Appends a bookmark. */
  withBookmarkAdded: (
    options: Readonly<{
      config: AvaMapConfigRead;
      bookmark: MapBookmark;
    }>,
  ): AvaMapConfigRead => {
    const { config, bookmark } = options;
    return { ...config, bookmarks: [...config.bookmarks, bookmark] };
  },

  /** Removes a bookmark by id. */
  withBookmarkRemoved: (
    options: Readonly<{
      config: AvaMapConfigRead;
      bookmarkId: MapBookmarkId;
    }>,
  ): AvaMapConfigRead => {
    const { config, bookmarkId } = options;
    const nextBookmarks = config.bookmarks.filter(propNotEq("id", bookmarkId));
    return nextBookmarks.length === config.bookmarks.length ?
        config
      : { ...config, bookmarks: nextBookmarks };
  },
};
