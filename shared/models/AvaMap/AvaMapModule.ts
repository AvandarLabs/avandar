import { Model } from "@models/Model/Model.ts";
import { uuid } from "$/lib/uuid.ts";
import type {
  AvaMapId,
  AvaMapRead,
  MapViewState,
} from "$/models/AvaMap/AvaMap.types.ts";

/** Opening camera position when a map has no data to fit yet. */
export const DEFAULT_MAP_VIEW_STATE: MapViewState = {
  center: [-74.006, 40.7128],
  zoom: 10,
};

export const AvaMapModule = {
  /**
   * A new, empty map with the default basemap and camera and no layers.
   * @param name The map's display name, already localized by the caller.
   */
  makeEmpty: (name: string): AvaMapRead => {
    return Model.make("AvaMap", {
      id: uuid<AvaMapId>(),
      version: 1,
      name,
      basemap: { type: "builtIn", style: "avandar" },
      view: DEFAULT_MAP_VIEW_STATE,
      layers: [],
    } as const);
  },
};
