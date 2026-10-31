import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { VizHydrationColumns } from "$/models/vizs/VizHydrationColumns.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

type PieAxesConfig = {
  nameKey: QueryColumn.Id | undefined;
  valueKey: QueryColumn.Id | undefined;
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
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
