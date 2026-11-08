import { objectValuesMap } from "@avandar/utils";
import * as arrow from "apache-arrow";
import { uuid } from "$/lib/uuid";
import { arrowFieldToQueryResultField } from "@/clients/DuckDbClient/arrowFieldToQueryResultField";
import { Logger } from "@/utils/Logger";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { ILogger } from "@avandar/logger";

/** The scale of a decimal type, or `undefined` for any other type. */
function _getDecimalScale(
  dataType: arrow.DataType | undefined,
): number | undefined {
  return dataType instanceof arrow.Decimal ? dataType.scale : undefined;
}

/**
 * Converts one Arrow cell to a plain JavaScript value. `dataType` is the
 * cell's Arrow type, which a decimal needs: it is stored as an unscaled
 * integer, so `2.25` in a `DECIMAL(4,2)` is `225` until the scale is applied.
 */
function _toJsValueFromArrowValue(
  value: unknown,
  dataType?: arrow.DataType,
): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value instanceof arrow.Vector) {
    // A list's items arrive as a Vector whose type is the item type.
    const itemType = value.type;
    // `Array.from` rather than `toArray()`: a list of numbers comes back from
    // `toArray()` as a typed array, which can only hold numbers.
    return Array.from(value as Iterable<unknown>, (item) => {
      return _toJsValueFromArrowValue(item, itemType);
    });
  }
  if (value instanceof arrow.StructRow || value instanceof arrow.MapRow) {
    const fieldTypes = new Map(
      (dataType?.children ?? []).map((field) => {
        return [field.name, field.type] as const;
      }),
    );
    return Object.fromEntries(
      Object.entries(value.toJSON()).map(([fieldName, fieldValue]) => {
        return [
          fieldName,
          _toJsValueFromArrowValue(fieldValue, fieldTypes.get(fieldName)),
        ];
      }),
    );
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const constructorName = (value as { constructor?: { name?: string } })
    .constructor?.name;
  if (constructorName !== "DecimalBigNum" && constructorName !== "BigNum") {
    return value;
  }
  const scale = _getDecimalScale(dataType);
  if (scale !== undefined) {
    // `String` gives the exact signed integer. `valueOf(scale)` adds the
    // integer's halves as floats, which can come back a float step off, and
    // throws when the whole part exceeds 2^53. Parsing the decimal text
    // rounds once, to the nearest double.
    return Number(`${String(value)}e-${scale}`);
  }
  const primitive = (value as { valueOf: () => unknown }).valueOf();
  return typeof primitive === "bigint" ? Number(primitive) : primitive;
}

/** Converts an Arrow table into a plain-JavaScript query result. */
export function arrowTableToJS<RowObject extends UnknownRow>(
  arrowTable: arrow.Table<Record<string, arrow.DataType>>,
  { logger = Logger }: { logger?: ILogger } = {},
): QueryResult.T<RowObject> {
  const columnTypes = new Map(
    arrowTable.schema.fields.map((field) => {
      return [field.name, field.type] as const;
    }),
  );
  const jsDataRows = arrowTable.toArray().map((row): RowObject => {
    const jsRow = row.toJSON();
    return objectValuesMap(jsRow, (value, columnName) => {
      return _toJsValueFromArrowValue(
        value,
        columnTypes.get(String(columnName)),
      );
    }) as RowObject;
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
