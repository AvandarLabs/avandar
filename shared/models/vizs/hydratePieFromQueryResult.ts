import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes.ts";
import type {
  QueryResultColumn,
} from "$/models/queries/QueryResult/QueryResult.types.ts";

type PieAxesConfig = {
  nameKey: string | undefined;
  valueKey: string | undefined;
};

/**
 * Hydrate `nameKey` and `valueKey` from query result column metadata when
 * they are undefined. Does not overwrite keys that are already set.
 *
 * `valueKey` ← first numeric column;
 * `nameKey` ← first temporal, then text, then boolean, then any remaining
 * column that is not the value key.
 *
 * @param currVizConfig The current pie-like viz config.
 * @param columns Result columns with names and `AvaDataType`.
 * @returns Updated config with any newly inferred keys.
 */
export function hydratePieFromQueryResult<VConfig extends PieAxesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResultColumn[],
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let next: VConfig = { ...currVizConfig };

  if (next.valueKey === undefined) {
    const valueCol = columns.find((c) => {
      return AvaDataTypes.isNumeric(c.dataType);
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
      return AvaDataTypes.isTemporal(c.dataType);
    });
    if (temporal !== undefined) {
      return { ...next, nameKey: temporal.name };
    }

    const text = others.find((c) => {
      return AvaDataTypes.isText(c.dataType);
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
