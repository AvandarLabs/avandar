import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { VizHydrationColumns } from "$/models/vizs/hydrations/VizHydrationColumns.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

type PieAxesConfig = {
  nameKey: QueryColumn.Id | undefined;
  valueKey: QueryColumn.Id | undefined;
};

/**
 * Fills the empty name and value slots of a config such as a pie or funnel
 * chart from `QueryResult` columns: the first numeric column for the value
 * and another column for the name, preferring temporal, then text, then
 * boolean. Set slots keep their column ID, even when the result lacks it.
 *
 * Use it so a chart has something to draw once a result arrives, for example
 * from raw SQL, where there is no structured query to seed from.
 */
export function hydratePieFromQueryResult<VConfig extends PieAxesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResult.ColumnWithId[],
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let nextConfig: VConfig = {
    ...currVizConfig,
    valueKey: currVizConfig.valueKey,
    nameKey: currVizConfig.nameKey,
  };

  if (nextConfig.valueKey === undefined) {
    const valueColumnId = VizHydrationColumns.getFirstNumericColumnId(columns);
    if (valueColumnId !== undefined) {
      nextConfig = { ...nextConfig, valueKey: valueColumnId };
    }
  }

  if (nextConfig.nameKey === undefined) {
    const valueKey = nextConfig.valueKey;
    const others = columns.filter((c) => {
      return c.id !== valueKey;
    });

    const temporal = others.find((c) => {
      return AvaDataType.isTemporal(c.dataType);
    });
    if (temporal !== undefined) {
      return { ...nextConfig, nameKey: temporal.id };
    }

    const text = others.find((c) => {
      return AvaDataType.isText(c.dataType);
    });
    if (text !== undefined) {
      return { ...nextConfig, nameKey: text.id };
    }

    const booleanCol = others.find((c) => {
      return c.dataType === "boolean";
    });
    if (booleanCol !== undefined) {
      return { ...nextConfig, nameKey: booleanCol.id };
    }

    if (others[0] !== undefined) {
      return { ...nextConfig, nameKey: others[0].id };
    }
  }

  return nextConfig;
}
