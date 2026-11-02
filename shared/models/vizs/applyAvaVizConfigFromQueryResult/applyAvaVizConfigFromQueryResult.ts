import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.ts";

type ApplyAvaVizConfigFromQueryResultOptions = {
  vizConfig: AvaVizConfig.T;
  rawSql: string | undefined;
  query: StructuredQuery.Partial;
  columns: readonly QueryResult.ColumnWithId[];
};

/** Compares every configured slot and style before emitting a state update. */
export function isVizConfigEqualForQueryResultSync(
  a: Readonly<AvaVizConfig.T>,
  b: Readonly<AvaVizConfig.T>,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Seeds unconfigured slots without replacing unresolved owned selections. */
export function applyAvaVizConfigFromQueryResult(
  input: Readonly<ApplyAvaVizConfigFromQueryResultOptions>,
): AvaVizConfig.T {
  return AvaVizConfigs.hydrateFromQueryResult(input.vizConfig, input.columns);
}
