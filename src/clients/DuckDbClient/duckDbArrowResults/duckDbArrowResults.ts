import { objectValuesMap } from "@avandar/utils";
import * as arrow from "apache-arrow";
import { uuid } from "$/lib/uuid";
import { arrowFieldToQueryResultField } from "@/clients/DuckDbClient/arrowFieldToQueryResultField";
import { Logger } from "@/utils/Logger";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { ILogger } from "@avandar/logger";

/** Whether a list item converts itself, as a struct row does. */
function _hasToJson(item: unknown): item is { toJSON: () => unknown } {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof (item as { toJSON?: unknown }).toJSON === "function"
  );
}

function _toJsValueFromArrowValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value instanceof arrow.Vector) {
    // `Array.from` rather than `toArray()`: a list of numbers comes back from
    // `toArray()` as a typed array, which can only hold numbers. A list of
    // text or numbers holds primitives with no `toJSON`; a struct row has one.
    return Array.from(value as Iterable<unknown>, (item) => {
      return _toJsValueFromArrowValue(
        item instanceof arrow.Vector || !_hasToJson(item)
          ? item
          : item.toJSON(),
      );
    });
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const constructorName = (value as { constructor?: { name?: string } })
    .constructor?.name;
  if (constructorName !== "DecimalBigNum" && constructorName !== "BigNum") {
    return value;
  }
  const primitive = (value as { valueOf: () => unknown }).valueOf();
  return typeof primitive === "bigint" ? Number(primitive) : primitive;
}

/** Converts an Arrow table into a plain-JavaScript query result. */
export function arrowTableToJS<RowObject extends UnknownRow>(
  arrowTable: arrow.Table<Record<string, arrow.DataType>>,
  { logger = Logger }: { logger?: ILogger } = {},
): QueryResult.T<RowObject> {
  const jsDataRows = arrowTable.toArray().map((row): RowObject => {
    const jsRow = row.toJSON();
    return objectValuesMap(jsRow, _toJsValueFromArrowValue) as RowObject;
  });
  return {
    id: uuid(),
    columns: arrowTable.schema.fields.map((field) => {
      return arrowFieldToQueryResultField(field, { logger });
    }),
    data: jsDataRows,
    numRows: jsDataRows.length,
  };
}
