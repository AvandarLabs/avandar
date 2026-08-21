import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { match } from "ts-pattern";
import { applyTimePredicateToSourceSql } from "../applyTimePredicateToSourceSql/applyTimePredicateToSourceSql";
import { compileBufferOfLayerQuery } from "../compileBufferOfLayerQuery/compileBufferOfLayerQuery";
import { compileBoundaryJoinQuery } from "./compileBoundaryJoinQuery";
import { compileGeometryColumnQuery } from "./compileGeometryColumnQuery";
import { compileGridBinQuery } from "./compileGridBinQuery";
import { compilePointAggregationQuery } from "./compilePointAggregationQuery";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";
import type { CompileOptions } from "./compileMapLayerSpatialQuery.types";

function _getTimeColumnName(
  options: Readonly<CompileOptions>,
): string | undefined {
  const timeColumn = options.layer.timeColumn;
  if (!timeColumn) {
    return undefined;
  }
  return options.metadata.sourceColumnNames.get(timeColumn);
}

function _compileBoundSourceQuery(
  options: Readonly<CompileOptions>,
): MapLayerSpatialQueryPlan {
  const binding = options.layer.geoBinding;
  const sourceSql = structuredQueryToSql(options.layer.source);
  if (!sourceSql) {
    throw new Error("The layer source query is incomplete");
  }
  if (!binding || binding.type === "bufferOfLayer") {
    throw new Error("The spatial binding is not supported by this compiler");
  }
  const filteredSourceSql = applyTimePredicateToSourceSql({
    sourceSql,
    timeColumnName: _getTimeColumnName(options),
    timeRange: options.overlay.timeRange,
  });
  const compileSource = { ...options, sourceSql: filteredSourceSql };
  return match(binding)
    .with({ type: "geometryColumn" }, () => {
      return compileGeometryColumnQuery(compileSource);
    })
    .with({ type: "joinToBoundaries" }, () => {
      return compileBoundaryJoinQuery(compileSource);
    })
    .with({ type: "aggregatePointsToBoundaries" }, () => {
      return compilePointAggregationQuery(compileSource);
    })
    .with({ type: "binPointsToGrid" }, () => {
      return compileGridBinQuery(compileSource);
    })
    .with({ type: "latLngColumns" }, () => {
      throw new Error("The spatial binding is not supported by this compiler");
    })
    .exhaustive();
}

/** Compiles one supported spatial layer to a one-row result envelope. */
export function compileMapLayerSpatialQuery(
  options: Readonly<CompileOptions>,
): MapLayerSpatialQueryPlan {
  const binding = options.layer.geoBinding;
  if (!binding) {
    throw new Error("The spatial binding is not supported by this compiler");
  }
  return match(binding)
    .with({ type: "bufferOfLayer" }, () => {
      return compileBufferOfLayerQuery(options);
    })
    .otherwise(() => {
      return _compileBoundSourceQuery(options);
    });
}
