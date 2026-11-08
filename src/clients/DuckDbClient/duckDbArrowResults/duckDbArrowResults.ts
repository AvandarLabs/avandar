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

const NANOSECONDS_PER_TIME_UNIT: Readonly<Record<arrow.TimeUnit, bigint>> = {
  [arrow.TimeUnit.SECOND]: 1_000_000_000n,
  [arrow.TimeUnit.MILLISECOND]: 1_000_000n,
  [arrow.TimeUnit.MICROSECOND]: 1_000n,
  [arrow.TimeUnit.NANOSECOND]: 1n,
};

/**
 * Reads a TIME value, counted in `unit`s since midnight, as `HH:MM:SS`. A
 * fraction is added as six digits only when it is not zero. Precision finer
 * than a microsecond is dropped.
 */
function _toClockTimeFromTimeValue(
  options: Readonly<{ unit: arrow.TimeUnit; timeValue: number | bigint }>,
): string {
  const { unit, timeValue } = options;
  const totalMicroseconds =
    (BigInt(timeValue) * NANOSECONDS_PER_TIME_UNIT[unit]) / 1_000n;
  const totalSeconds = totalMicroseconds / 1_000_000n;
  const fractionMicroseconds = totalMicroseconds % 1_000_000n;
  const [hours, minutes, seconds] = [
    totalSeconds / 3_600n,
    (totalSeconds / 60n) % 60n,
    totalSeconds % 60n,
  ].map((part) => {
    return String(part).padStart(2, "0");
  });
  const fraction =
    fractionMicroseconds === 0n
      ? ""
      : `.${String(fractionMicroseconds).padStart(6, "0")}`;
  return `${hours}:${minutes}:${seconds}${fraction}`;
}

/**
 * One element of a LIST cell. A list result column is described as text, so
 * its dates, timestamps and times become strings rather than epoch numbers that
 * nothing downstream could tell from a count. Any other element goes through
 * the same conversion as a top-level cell.
 */
function _toJsListItem(
  options: Readonly<{ itemType: arrow.DataType; item: unknown }>,
): unknown {
  const { itemType, item } = options;
  if (item === null || item === undefined) {
    return null;
  }
  if (arrow.DataType.isDate(itemType)) {
    return new Date(item as number).toISOString().slice(0, 10);
  }
  if (arrow.DataType.isTimestamp(itemType)) {
    return new Date(item as number).toISOString();
  }
  if (arrow.DataType.isTime(itemType)) {
    return _toClockTimeFromTimeValue({
      unit: itemType.unit,
      timeValue: item as number | bigint,
    });
  }
  return _toJsValueFromArrowValue(item, itemType);
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
      return _toJsListItem({ itemType, item });
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
