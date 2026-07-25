import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";

type PieAxesConfig = {
  nameKey: string | undefined;
  valueKey: string | undefined;
};

/**
 * Reconcile a pie/funnel config against current query columns:
 *
 *   1. Prune `nameKey` / `valueKey` if either references a column the
 *      query no longer returns.
 *   2. Seed `valueKey` from the first numeric column.
 *   3. Seed `nameKey` from the first non-value temporal, then text,
 *      then boolean, then any remaining column.
 *
 * Goal: when a query result changes columns, the chart never silently
 * references a missing column. Stale keys are dropped and sensible
 * defaults seeded so a config always renders something useful.
 *
 * @param currVizConfig The current pie-like viz config.
 * @param columns Result columns with names and `AvaDataType`.
 * @returns Updated config with stale keys pruned and defaults seeded.
 */
export function hydratePieFromQueryResult<VConfig extends PieAxesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResultColumn[],
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }
  const colNames = new Set(
    columns.map((c) => {
      return c.name;
    }),
  );

  let next: VConfig = {
    ...currVizConfig,
    valueKey:
      currVizConfig.valueKey && colNames.has(currVizConfig.valueKey) ?
        currVizConfig.valueKey
      : undefined,
    nameKey:
      currVizConfig.nameKey && colNames.has(currVizConfig.nameKey) ?
        currVizConfig.nameKey
      : undefined,
  };

  if (next.valueKey === undefined) {
    const valueCol = columns.find((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
    if (valueCol !== undefined) {
      next = { ...next, valueKey: valueCol.name };
    }
  }

  if (next.nameKey === undefined) {
    const valueKey = next.valueKey;
    const others = columns.filter((c) => {
      return c.name !== valueKey;
    });

    const temporal = others.find((c) => {
      return AvaDataType.isTemporal(c.dataType);
    });
    if (temporal !== undefined) {
      return { ...next, nameKey: temporal.name };
    }

    const text = others.find((c) => {
      return AvaDataType.isText(c.dataType);
    });
    if (text !== undefined) {
      return { ...next, nameKey: text.name };
    }

    const booleanCol = others.find((c) => {
      return c.dataType === "boolean";
    });
    if (booleanCol !== undefined) {
      return { ...next, nameKey: booleanCol.name };
    }

    if (others[0] !== undefined) {
      return { ...next, nameKey: others[0].name };
    }
  }

  return next;
}
