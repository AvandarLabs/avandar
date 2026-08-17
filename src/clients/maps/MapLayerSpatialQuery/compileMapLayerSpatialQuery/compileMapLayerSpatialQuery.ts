import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { match } from "ts-pattern";
import { compileBoundaryJoinQuery } from "./compileBoundaryJoinQuery";
import { compileGeometryColumnQuery } from "./compileGeometryColumnQuery";
import { compileGridBinQuery } from "./compileGridBinQuery";
import { compilePointAggregationQuery } from "./compilePointAggregationQuery";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";
import type { CompileOptions } from "./compileMapLayerSpatialQuery.types";

/** Compiles one supported spatial layer to a one-row result envelope. */
export function compileMapLayerSpatialQuery(
  options: Readonly<CompileOptions>,
): MapLayerSpatialQueryPlan {
  const binding = options.layer.geoBinding;
  const sourceSql = structuredQueryToSql(options.layer.source);
  if (!sourceSql) {
    throw new Error("The layer source query is incomplete");
  }
  if (!binding) {
    throw new Error("The spatial binding is not supported by this compiler");
  }
  return match(binding)
    .with({ type: "geometryColumn" }, () => {
      return compileGeometryColumnQuery({ ...options, sourceSql });
    })
    .with({ type: "joinToBoundaries" }, () => {
      return compileBoundaryJoinQuery({ ...options, sourceSql });
    })
    .with({ type: "aggregatePointsToBoundaries" }, () => {
      return compilePointAggregationQuery({ ...options, sourceSql });
    })
    .with({ type: "binPointsToGrid" }, () => {
      return compileGridBinQuery({ ...options, sourceSql });
    })
    .with({ type: "latLngColumns" }, () => {
      throw new Error("The spatial binding is not supported by this compiler");
    })
    .exhaustive();
}
