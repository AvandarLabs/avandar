import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.ts";
type ApplyVizConfigFromQueryResultOptions = {
  vizConfig: VizConfig.T;
  rawSql: string | undefined;
  query: StructuredQuery.Partial;
  columns: readonly QueryResult.ColumnWithId[];
};

/** Compares every configured slot and style before emitting a state update. */
export function isVizConfigEqualForQueryResultSync(
  a: Readonly<VizConfig.T>,
  b: Readonly<VizConfig.T>,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Seeds unconfigured slots without replacing unresolved owned selections. */
export function applyVizConfigFromQueryResult(
  input: Readonly<ApplyVizConfigFromQueryResultOptions>,
): VizConfig.T {
  return VizConfigs.hydrateFromQueryResult(input.vizConfig, input.columns);
}
