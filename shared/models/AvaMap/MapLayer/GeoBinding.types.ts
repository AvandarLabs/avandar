import type { UUID } from "@avandar/utils";
import type { MapLayerId } from "$/models/AvaMap/MapLayer/MapLayer.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type {
  DatasetColumn, // prettier-ignore
} from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/** Encodings accepted for a persisted geometry-column reference. */
export const GEOMETRY_ENCODINGS = ["wkt", "wkb", "geojson"] as const;
export type GeometryEncoding = (typeof GEOMETRY_ENCODINGS)[number];

/** True when `value` is a persisted geometry encoding. */
export function isGeometryEncoding(value: string): value is GeometryEncoding {
  return (GEOMETRY_ENCODINGS as readonly string[]).includes(value);
}

/** Geometry families rendered by one map layer. */
export const GEOMETRY_FAMILIES = ["point", "line", "polygon"] as const;
export type GeometryFamily = (typeof GEOMETRY_FAMILIES)[number];

/** True when `value` is a rendered geometry family. */
export function isGeometryFamily(value: string): value is GeometryFamily {
  return (GEOMETRY_FAMILIES as readonly string[]).includes(value);
}

/** Screen-space tolerance persisted for topology-preserving simplification. */
export type GeometrySimplification = { tolerancePixels: number };

/** Stable identity for the output produced by one area aggregation. */
export type AreaAggregationOutputId = UUID<"AreaAggregationOutput">;

/** An aggregation that produces one value for each boundary. */
export type AreaAggregation =
  | { operation: "count"; outputValueId: AreaAggregationOutputId }
  | {
      operation: "sum" | "avg" | "min" | "max";
      measureColumn: QueryColumn.Id;
      outputValueId: AreaAggregationOutputId;
    };

/** A workspace dataset and its columns used as polygon boundaries. */
export type BoundarySourceRef = {
  datasetId: Dataset.Id;
  geometryColumnId: DatasetColumn.Id;
  geometryEncoding: GeometryEncoding;
  keyColumnId: DatasetColumn.Id;
  displayNameColumnId: DatasetColumn.Id | undefined;
  simplification: GeometrySimplification;
};

/** A pair of numeric query columns interpreted as point coordinates. */
export type LatLngColumnsBinding = {
  type: "latLngColumns";
  latitude: QueryColumn.Id | undefined;
  longitude: QueryColumn.Id | undefined;
};

/** A query column containing encoded geometry. */
export type GeometryColumnBinding = {
  type: "geometryColumn";
  column: QueryColumn.Id;
  encoding: GeometryEncoding;
  family: GeometryFamily;
  simplification: GeometrySimplification | undefined;
  sourceCrs: number | undefined;
};

/** Source rows grouped onto workspace boundaries by matching keys. */
export type BoundaryJoinBinding = {
  type: "joinToBoundaries";
  dataKeyColumn: QueryColumn.Id;
  boundary: BoundarySourceRef;
  matching: "exact" | "normalizedName";
  aggregation: AreaAggregation;
};

/** Point input accepted by point-in-polygon aggregation. */
export type PointBinding =
  | LatLngColumnsBinding
  | {
      type: "geometryColumn";
      column: QueryColumn.Id;
      encoding: GeometryEncoding;
      family: "point";
      simplification: undefined;
      sourceCrs: number | undefined;
    };

/** Point rows grouped by the polygon that spatially contains them. */
export type PointAggregationBinding = {
  type: "aggregatePointsToBoundaries";
  points: PointBinding;
  boundary: BoundarySourceRef;
  aggregation: AreaAggregation;
};

/** Point rows grouped into fixed-size grid cells. */
export type GridBinBinding = {
  type: "binPointsToGrid";
  grid: "hex" | "square";
  sizeMeters: number;
  points: PointBinding;
  aggregation: AreaAggregation;
};

/** Polygon geometry produced by buffering another layer's features. */
export type BufferOfLayerBinding = {
  type: "bufferOfLayer";
  layerId: MapLayerId;
  distanceMeters: number;
  dissolve: boolean;
};

/** A binding whose output is safe to render as an area. */
export type AreaGeoBinding =
  | (GeometryColumnBinding & { family: "polygon" })
  | BoundaryJoinBinding
  | PointAggregationBinding
  | GridBinBinding
  | BufferOfLayerBinding;

/**
 * How a layer's rows become geometry.
 *
 * `latLngColumns` deliberately compiles to no DuckDB `ST_*` call, so a point
 * map keeps working when the optional `spatial` extension is unavailable.
 * Bindings that do need geometry functions (boundary joins, binning) are added
 * as further members of this union.
 *
 * `latitude` and `longitude` are independently optional so that picking one
 * axis alone never yields usable column names: a half-picked binding that
 * still produced geometry would plot points on the diagonal where latitude
 * equals longitude, which looks like a real result and is not.
 */
export type GeoBinding =
  | LatLngColumnsBinding
  | GeometryColumnBinding
  | BoundaryJoinBinding
  | PointAggregationBinding
  | GridBinBinding
  | BufferOfLayerBinding;

/**
 * A {@link GeoBinding} whose column ids have been replaced with the column
 * names that query result rows are actually keyed by.
 */
export type GeoBindingColumnNames = {
  type: "latLngColumns";
  latitudeColumnName: string;
  longitudeColumnName: string;
};
