import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { MapLayerRead } from "$/models/AvaMap/MapLayer/MapLayer.types.ts";

type ModelType = "AvaMap";
type CurrentAvaMapVersion = 1;

export type AvaMapId = UUID<ModelType>;

/**
 * Where the map is looking. `center` is `[longitude, latitude]`, MapLibre
 * order.
 */
export type MapViewState = {
  center: readonly [longitude: number, latitude: number];
  zoom: number;
};

/** Keys of the basemap styles the app ships. Style URLs live in the GIS app. */
export type BasemapStyleKey =
  | "avandar"
  | "positron"
  | "bright"
  | "liberty"
  | "dark"
  | "fiord";

/**
 * The map's backdrop. `none` renders a flat background instead of tiles, which
 * is the usable fallback when tile hosts are unreachable.
 */
export type BasemapConfig =
  | { type: "builtIn"; style: BasemapStyleKey }
  | { type: "none"; background: string };

/** A saved map: a basemap, a camera position, and an ordered layer stack. */
export type AvaMapRead = Model.Versioned<
  ModelType,
  CurrentAvaMapVersion,
  {
    id: AvaMapId;
    name: string;
    basemap: BasemapConfig;
    view: MapViewState;

    /** Draw order, bottom to top. */
    layers: readonly MapLayerRead[];
  }
>;
