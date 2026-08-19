import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";
import type {
  ExportLayout, // prettier-ignore
} from "$/models/AvaMap/AvaMapConfig/ExportLayout.types.ts";
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

/** One WGS 84 GeoJSON Polygon used as the map's area of interest. */
export type AoiPolygon = {
  type: "Polygon";
  coordinates: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
};

/** Inclusive ISO-8601 instants for the map clock. */
export type TimeRange = {
  start: string;
  end: string;
};

/** Identifies one persisted annotation feature. */
export type AnnotationFeatureId = UUID<"AnnotationFeature">;

/** Discriminator for a persisted annotation drawing. */
export type AnnotationKind =
  (typeof AvaMapConfigValues.annotationKinds)[number];

/** A persisted drawing on the map that is not a data layer. */
export type AnnotationFeature =
  | {
      id: AnnotationFeatureId;
      kind: "text";
      geometry: { type: "Point"; coordinates: [number, number] };
      text: string;
      sizePx: number;
      color: string;
    }
  | {
      id: AnnotationFeatureId;
      kind: "arrow";
      geometry: {
        type: "LineString";
        coordinates: readonly [[number, number], [number, number]];
      };
      color: string;
      strokeWidthPx: number;
    }
  | {
      id: AnnotationFeatureId;
      kind: "freehand";
      geometry: {
        type: "LineString";
        coordinates: ReadonlyArray<[number, number]>;
      };
      color: string;
      strokeWidthPx: number;
    }
  | {
      id: AnnotationFeatureId;
      kind: "area";
      geometry: AoiPolygon;
      color: string;
      opacity: number;
      stroke: { color: string; widthPx: number };
    };

/** Visibility and features for the map's annotation overlay. */
export type AnnotationLayer = {
  isVisible: boolean;
  features: readonly AnnotationFeature[];
};

type AvaMapConfigBody = {
  basemap: BasemapConfig;
  view: MapViewState;

  /** Saved camera positions, in the order the author created them. */
  bookmarks: readonly MapBookmark[];

  /** Draw order, bottom to top. */
  layers: readonly MapLayer.T[];

  /** Spatial filter polygon, or unset when no AOI is applied. */
  aoi: AoiPolygon | undefined;

  /** Inclusive time window, or unset when no clock filter is applied. */
  timeRange: TimeRange | undefined;

  annotations: AnnotationLayer;

  /**
   * How many data layers from the bottom sit under the annotation overlay.
   * `0` is under every data layer; `layers.length` is on top.
   */
  annotationsZIndex: number;

  /** Persisted page furniture for the PDF export. */
  exportLayout: ExportLayout;
};

/**
 * The editable body of a map: a basemap, a camera position, an ordered
 * layer stack, and map-level overlay state. Persisted as the `config`
 * column of a `maps` row, so it is versioned and carries no row identity
 * of its own.
 */
export type AvaMapConfigRead = Model.Versioned<
  "AvaMapConfig",
  5,
  AvaMapConfigBody
>;
