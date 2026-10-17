import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.ts";

/** Compares every configured slot and style before emitting a state update. */
export function isVizConfigEqualForQueryResultSync(
  a: VizConfig.T,
  b: VizConfig.T,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Seeds unconfigured slots without replacing unresolved owned selections. */
export function applyVizConfigFromQueryResult(
  input: Readonly<{
    vizConfig: VizConfig.T;
    rawSql: string | undefined;
    query: StructuredQuery.Partial;
    columns: readonly QueryResult.BoundColumn[];
  }>,
): VizConfig.T {
  return VizConfigs.hydrateFromQueryResult(input.vizConfig, input.columns);
}
