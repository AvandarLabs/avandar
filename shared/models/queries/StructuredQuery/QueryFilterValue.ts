import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

type FilterValue = QueryFilterRule["value"];

function _isBlank(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

/**
 * The single value a scalar operator compares against, or `undefined` when the
 * rule has no usable value yet.
 */
export function filterValueAsScalar(
  value: FilterValue,
): string | number | boolean | undefined {
  if (Array.isArray(value)) {
    const [first] = value;
    return _isBlank(first) ? undefined : first;
  }
  return _isBlank(value) ? undefined : (value as string | number | boolean);
}

/**
 * The list a list operator compares against. Arrays pass through with blanks
 * dropped; a string is split on commas and trimmed, which is how list values
 * were encoded before they became arrays.
 */
export function filterValueAsList(
  value: FilterValue,
  options: { dropEmpty?: boolean } = {},
): ReadonlyArray<string | number> {
  const dropEmpty = options.dropEmpty ?? true;
  const items =
    Array.isArray(value) ? [...value]
    : _isBlank(value) ? []
    : String(value)
        .split(",")
        .map((part) => {
          return part.trim();
        });
  return dropEmpty ?
      items.filter((item) => {
        return !_isBlank(item);
      })
    : items;
}

/** Both bounds of a `between`, or `undefined` when either is missing. */
export function filterValueAsPair(
  value: FilterValue,
): readonly [string | number, string | number] | undefined {
  const items = filterValueAsList(value, { dropEmpty: false });
  const [lower, upper] = items;
  if (_isBlank(lower) || _isBlank(upper)) {
    return undefined;
  }
  return [lower as string | number, upper as string | number];
}

/**
 * Coerces one value to the literal type the column wants, so numeric columns
 * bind as numbers rather than quoted strings. Values that cannot be coerced are
 * returned unchanged; `validateFilterRule` is what reports them to the user.
 *
 * An unknown column type passes the value through untouched, which is exactly
 * what the SQL layer did before typed literals existed, so rules saved without
 * a `columnDataType` keep rendering the way they always have.
 */
export function coerceFilterLiteral(
  value: string | number | boolean,
  dataType: AvaDataTypeNs.T | undefined,
): string | number | boolean {
  if (dataType === undefined) {
    return value;
  }
  if (AvaDataType.isNumeric(dataType)) {
    if (typeof value === "number") {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && String(value).trim() !== "" ?
        parsed
      : value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return String(value);
}
