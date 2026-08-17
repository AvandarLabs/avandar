import type { ResolvedMapLayerMetadata } from "../MapLayerSpatialQuery.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Inputs required to compile one spatial layer into DuckDB SQL. */
export type CompileOptions = {
  layer: MapLayer.T;
  metadata: ResolvedMapLayerMetadata;
  zoomBand: number;
  simplificationReferenceLatitude: number;
};

/** Compile inputs plus the already-rendered source SQL. */
export type CompileSourceOptions = CompileOptions & {
  sourceSql: string;
};
