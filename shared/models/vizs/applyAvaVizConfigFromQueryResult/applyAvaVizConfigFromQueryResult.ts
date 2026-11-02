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

/**
 * Whether two viz configs match in every slot and setting. Use it to skip a
 * state update when filling a config from a query result changed nothing,
 * for example when the same result arrives again.
 */
export function isVizConfigEqualForQueryResultSync(
  a: Readonly<AvaVizConfig.T>,
  b: Readonly<AvaVizConfig.T>,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Fills a viz config's empty slots from a query result's columns, keeping
 * every slot already set, even when the result lacks its column. Use it
 * whenever a chart's query returns a result, for example after raw SQL
 * runs, so the chart has something to draw.
 */
export function applyAvaVizConfigFromQueryResult(
  input: Readonly<ApplyAvaVizConfigFromQueryResultOptions>,
): AvaVizConfig.T {
  return AvaVizConfigs.hydrateFromQueryResult(input.vizConfig, input.columns);
}
