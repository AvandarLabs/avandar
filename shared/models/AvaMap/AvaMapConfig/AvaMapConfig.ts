/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  AnnotationFeatureId as AnnotationFeatureIdType,
  AnnotationFeature as AnnotationFeatureType,
  AnnotationKind as AnnotationKindType,
  AnnotationLayer as AnnotationLayerType,
  AoiPolygon as AoiPolygonType,
  AvaMapConfigRead,
  BasemapConfig,
  BasemapStyleKey,
  CustomBasemapKind as CustomBasemapKindType,
  MapBookmark,
  MapBookmarkId,
  MapViewState,
  TimeRange as TimeRangeType,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";
import type {
  ExportHeaderLine as ExportHeaderLineType,
  ExportLayout as ExportLayoutType,
  ExportOrientation as ExportOrientationType,
  ExportPaper as ExportPaperType,
} from "$/models/AvaMap/AvaMapConfig/ExportLayout.types.ts";

/** Public model namespace for a map's editable configuration. */
// oxfmt-ignore
export {
  AvaMapConfigModule as AvaMapConfig,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts";

export namespace AvaMapConfig {
  /** A persisted map configuration. */
  export type T = AvaMapConfigRead;
  /** A built-in or custom basemap configuration. */
  export type Basemap = BasemapConfig;
  /** Identifies a built-in basemap style. */
  export type BasemapStyle = BasemapStyleKey;
  /** Identifies the tile protocol for a custom basemap. */
  export type CustomBasemapKind = CustomBasemapKindType;
  /** A persisted map camera position. */
  export type ViewState = MapViewState;
  /** A saved camera position in a map configuration. */
  export type Bookmark = MapBookmark;
  /** Identifies a saved camera position in a map configuration. */
  export type BookmarkId = MapBookmarkId;
  /** One WGS 84 GeoJSON Polygon used as the map's area of interest. */
  export type AoiPolygon = AoiPolygonType;
  /** Inclusive ISO-8601 instants for the map clock. */
  export type TimeRange = TimeRangeType;
  /** Visibility and features for the map's annotation overlay. */
  export type AnnotationLayer = AnnotationLayerType;
  /** A persisted drawing on the map that is not a data layer. */
  export type AnnotationFeature = AnnotationFeatureType;
  /** Identifies one persisted annotation feature. */
  export type AnnotationFeatureId = AnnotationFeatureIdType;
  /** Discriminator for a persisted annotation drawing. */
  export type AnnotationKind = AnnotationKindType;
  /** Persisted page furniture for the PDF export. */
  export type ExportLayout = ExportLayoutType;
  /** A paper size the export sheet offers. */
  export type ExportPaper = ExportPaperType;
  /** A page orientation the export sheet offers. */
  export type ExportOrientation = ExportOrientationType;
  /** One optional header line: whether it prints, and the author's text. */
  export type ExportHeaderLine = ExportHeaderLineType;
}
