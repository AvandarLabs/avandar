import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/**
 * Where the map is looking. `center` is `[longitude, latitude]`, MapLibre
 * order.
 */
export type MapViewState = {
  center: [longitude: number, latitude: number];
  zoom: number;
};

/** Identifies a saved camera position in a map configuration. */
export type MapBookmarkId = UUID<"MapBookmark">;

/** A saved camera position the author can return to from the Views menu. */
export type MapBookmark = {
  id: MapBookmarkId;
  name: string;
  view: MapViewState;
};

/** Tile protocols a workspace can point the map at. */
export type CustomBasemapKind =
  (typeof AvaMapConfigValues.customBasemapKinds)[number];

/** Keys of the basemap styles the app ships. Style URLs live in the GIS app. */
export type BasemapStyleKey =
  (typeof AvaMapConfigValues.basemapStyleKeys)[number];

type CustomBasemapConfig = {
  type: "custom";
  kind: CustomBasemapKind;
  url: string;
  attribution: string;
};

/**
 * The map's backdrop.
 *
 * `custom` exists because humanitarian deployments routinely have their own
 * tile server, and `none` renders a flat background instead of tiles, which is
 * the usable fallback when tile hosts are unreachable. A `custom` source
 * carries its own attribution because we cannot know it, and the furniture
 * strip may never show an unattributed basemap.
 */
export type BasemapConfig =
  | { type: "builtIn"; style: BasemapStyleKey }
  | CustomBasemapConfig
  | { type: "none"; background: string };

type AvaMapConfigBody = {
  basemap: BasemapConfig;
  view: MapViewState;

  /** Saved camera positions, in the order the author created them. */
  bookmarks: readonly MapBookmark[];

  /** Draw order, bottom to top. */
  layers: readonly MapLayer.T[];
};

/**
 * The editable body of a map: a basemap, a camera position, and an ordered
 * layer stack. Persisted as the `config` column of a `maps` row, so it is
 * versioned and carries no row identity of its own.
 */
export type AvaMapConfigRead = Model.Versioned<
  "AvaMapConfig",
  2,
  AvaMapConfigBody
>;
