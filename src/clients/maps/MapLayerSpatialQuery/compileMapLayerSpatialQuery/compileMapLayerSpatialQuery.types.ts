import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ResolvedMapLayerMetadata } from "../MapLayerSpatialQuery.types";

/** Map-level AOI and time window applied while compiling a layer query. */
export type MapOverlay = {
  aoi: AvaMapConfig.AoiPolygon | undefined;
  timeRange: AvaMapConfig.TimeRange | undefined;
};

/** Inputs required to compile one spatial layer into DuckDB SQL. */
export type CompileOptions = {
  layer: MapLayer.T;
  metadata: ResolvedMapLayerMetadata;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  overlay: MapOverlay;
  stack: readonly MapLayer.T[];
};

/** Compile inputs plus the already-rendered source SQL. */
export type CompileSourceOptions = CompileOptions & {
  sourceSql: string;
};

/**
 * Compile inputs for a layer whose spatial filter names another layer. That
 * layer compiles with its own column metadata, so the caller supplies a
 * resolver instead of one layer's metadata. For example, the map render and
 * a feature list both compile through it.
 */
export type SpatialFilterCompileOptions = Omit<CompileOptions, "metadata"> & {
  resolveMetadata: (layer: MapLayer.T) => ResolvedMapLayerMetadata;
};
