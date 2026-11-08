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
 * A date, timestamp or time as text, or `undefined` for any other type. A date
 * is `YYYY-MM-DD` and a timestamp is ISO with `Z`, both read in UTC. A time is
 * `HH:MM:SS`.
 */
function _toTemporalText(
  options: Readonly<{ dataType: arrow.DataType; value: unknown }>,
): string | undefined {
  const { dataType, value } = options;
  if (arrow.DataType.isDate(dataType)) {
    return new Date(value as number).toISOString().slice(0, 10);
  }
  if (arrow.DataType.isTimestamp(dataType)) {
    return new Date(value as number).toISOString();
  }
  if (arrow.DataType.isTime(dataType)) {
    return _toClockTimeFromTimeValue({
      unit: dataType.unit,
      timeValue: value as number | bigint,
    });
  }
  return undefined;
}

/**
 * Whether a value is a decimal as Arrow hands it over: a big number object
 * holding the unscaled integer.
 */
function _isBigNum(value: unknown): value is object {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const constructorName = (value as { constructor?: { name?: string } })
    .constructor?.name;
  return constructorName === "DecimalBigNum" || constructorName === "BigNum";
}

/**
 * Whether a union member of `memberType` can have produced `value`. A union
 * cell arrives as its member's value with no tag, so the member is told by
 * the value's kind: a list for a vector, a map for a map row, a struct for a
 * struct row, and a decimal for a big number.
 */
function _isUnionMemberOfValue(
  options: Readonly<{ memberType: arrow.DataType; value: unknown }>,
): boolean {
  const { memberType, value } = options;
  if (value instanceof arrow.Vector) {
    return memberType instanceof arrow.List;
  }
  if (value instanceof arrow.MapRow) {
    return memberType instanceof arrow.Map_;
  }
  if (value instanceof arrow.StructRow) {
    return memberType instanceof arrow.Struct;
  }
  return _isBigNum(value) && memberType instanceof arrow.Decimal;
}

/**
 * The type of the union member a value came from, or `undefined` when no
 * member or more than one member of its kind could have produced it. Two
 * decimal members are told apart only by the row's type id, which a cell
 * does not carry, so such a value reads as it arrives.
 */
function _getUnionMemberType(
  options: Readonly<{ unionType: arrow.Union; value: unknown }>,
): arrow.DataType | undefined {
  const memberTypes = options.unionType.children
    .map((field) => {
      return field.type;
    })
    .filter((memberType) => {
      return _isUnionMemberOfValue({ memberType, value: options.value });
    });
  return memberTypes.length === 1 ? memberTypes[0] : undefined;
}

/**
 * Converts every entry of a map cell. All of a map's values share one type,
 * held by the `value` field of its `entries` struct rather than by a field
 * named for each key. Inside a list, a value's dates, timestamps and times
 * become text.
 */
function _toJsObjectFromMapRow(
  options: Readonly<{
    mapRow: arrow.MapRow;
    dataType?: arrow.DataType;
    isInsideList: boolean;
  }>,
): Record<string, unknown> {
  const { mapRow, dataType, isInsideList } = options;
  const valueType =
    dataType instanceof arrow.Map_ ? dataType.valueType : undefined;
  return Object.fromEntries(
    Object.entries(mapRow.toJSON()).map(([key, entryValue]) => {
      return [
        key,
        isInsideList && valueType !== undefined
          ? _toJsListItem({ itemType: valueType, item: entryValue })
          : _toJsValueFromArrowValue(entryValue, valueType),
      ];
    }),
  );
}

/**
 * Converts every field of a struct cell by the type of the field of that name.
 * Inside a list, a field's dates, timestamps and times become text.
 */
function _toJsObjectFromStructRow(
  options: Readonly<{
    structRow: arrow.StructRow;
    dataType?: arrow.DataType;
    isInsideList: boolean;
  }>,
): Record<string, unknown> {
  const { structRow, dataType, isInsideList } = options;
  const fieldTypes = new Map(
    (dataType?.children ?? []).map((field) => {
      return [field.name, field.type] as const;
    }),
  );
  return Object.fromEntries(
    Object.entries(structRow.toJSON()).map(([fieldName, fieldValue]) => {
      const fieldType = fieldTypes.get(fieldName);
      return [
        fieldName,
        isInsideList && fieldType !== undefined
          ? _toJsListItem({ itemType: fieldType, item: fieldValue })
          : _toJsValueFromArrowValue(fieldValue, fieldType),
      ];
    }),
  );
}

/**
 * Converts a decimal, or any other big number, to a JavaScript number. A
 * decimal has its scale applied.
 */
function _toJsNumberFromBigNum(
  options: Readonly<{ bigNum: object; dataType?: arrow.DataType }>,
): unknown {
  const { bigNum, dataType } = options;
  const scale = _getDecimalScale(dataType);
  if (scale !== undefined) {
    // `String` gives the exact signed integer. `valueOf(scale)` adds the
    // integer's halves as floats, which can come back a float step off, and
    // throws when the whole part exceeds 2^53. Parsing the decimal text
    // rounds once, to the nearest double.
    return Number(`${String(bigNum)}e-${scale}`);
  }
  const primitive = (bigNum as { valueOf: () => unknown }).valueOf();
  return typeof primitive === "bigint" ? Number(primitive) : primitive;
}

/**
 * One element of a LIST cell. A list result column is described as text, so
 * its dates, timestamps and times become strings rather than epoch numbers that
 * nothing downstream could tell from a count. This holds at every depth inside
 * the element: a date in a struct in a list, such as a per-period field's
 * `bucket`, is a `YYYY-MM-DD` string. Any other element goes through the same
 * conversion as a top-level cell.
 */
function _toJsListItem(
  options: Readonly<{ itemType: arrow.DataType; item: unknown }>,
): unknown {
  const { itemType, item } = options;
  if (item === null || item === undefined) {
    return null;
  }
  return (
    _toTemporalText({ dataType: itemType, value: item }) ??
    _toJsValueFromArrowValue(item, itemType, { isInsideList: true })
  );
}

/**
 * Converts one Arrow cell to a plain JavaScript value. `dataType` is the
 * cell's Arrow type, which a decimal needs: it is stored as an unscaled
 * integer, so `2.25` in a `DECIMAL(4,2)` is `225` until the scale is applied.
 * `isInsideList` is set for a value within a LIST element, where dates,
 * timestamps and times become text.
 */
function _toJsValueFromArrowValue(
  value: unknown,
  dataType?: arrow.DataType,
  { isInsideList = false }: Readonly<{ isInsideList?: boolean }> = {},
): unknown {
  if (dataType instanceof arrow.Union) {
    // A union cell is its member's value, so it converts as that member.
    return _toJsValueFromArrowValue(
      value,
      _getUnionMemberType({ unionType: dataType, value }),
      { isInsideList },
    );
  }
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
  if (value instanceof arrow.MapRow) {
    return _toJsObjectFromMapRow({ mapRow: value, dataType, isInsideList });
  }
  if (value instanceof arrow.StructRow) {
    return _toJsObjectFromStructRow({
      structRow: value,
      dataType,
      isInsideList,
    });
  }
  if (!_isBigNum(value)) {
    return value;
  }
  return _toJsNumberFromBigNum({ bigNum: value, dataType });
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
