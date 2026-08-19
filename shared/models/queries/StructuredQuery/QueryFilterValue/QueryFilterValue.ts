import { isArray, isNullish } from "@avandar/utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

type FilterValue = QueryFilterRule["value"];

/** Narrows to the members a scalar operator can actually bind. */
function _isBindableScalar(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function _isBlank(value: unknown): boolean {
  return isNullish(value) || (typeof value === "string" && value.trim() === "");
}

function _getScalar(value: FilterValue): string | number | boolean | undefined {
  const candidate = isArray(value) ? value[0] : value;
  return _isBlank(candidate) || !_isBindableScalar(candidate) ?
      undefined
    : candidate;
}

function _getList(
  options: Readonly<{ value: FilterValue; dropEmpty?: boolean }>,
): Array<string | number> {
  const dropEmpty = options.dropEmpty ?? true;
  const items =
    isArray(options.value) ?
      options.value.filter((item): item is string | number => {
        return typeof item === "string" || typeof item === "number";
      })
    : _isBlank(options.value) ? []
    : String(options.value)
        .split(",")
        .map((part) => {
          return part.trim();
        });
  return dropEmpty ?
      items.filter((item) => {
        return !_isBlank(item);
      })
    : [...items];
}

function _getPair(
  value: FilterValue,
): [string | number, string | number] | undefined {
  const [lower, upper] = _getList({ value, dropEmpty: false });
  return (
      lower === undefined ||
        upper === undefined ||
        _isBlank(lower) ||
        _isBlank(upper)
    ) ?
      undefined
    : [lower, upper];
}

function _makeLiteral(
  options: Readonly<{
    value: string | number | boolean;
    dataType: AvaDataTypeNs.T | undefined;
  }>,
): string | number | boolean {
  const { value, dataType } = options;
  // Only a numeric column coerces, and only when the text really is a number:
  // anything else is reported by `validateFilterRule` rather than mangled here.
  const asNumber = (() => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && String(value).trim() !== "" ?
        parsed
      : value;
  })();
  return (
    dataType === undefined ? value
    : AvaDataType.isNumeric(dataType) ?
      typeof value === "number" ?
        value
      : asNumber
    : typeof value === "boolean" ? value
    : String(value)
  );
}

/** Reads a filter rule's `value` in the shape a given operator needs. */
export const QueryFilterValue = {
  /**
   * The single value a scalar operator compares against, or `undefined` when
   * the rule has no usable value yet.
   */
  getScalar: _getScalar,

  /**
   * The list a list operator compares against. Arrays pass through with blanks
   * dropped; a comma-joined string is also accepted so older saved filters
   * still parse.
   */
  getList: _getList,

  /** Both bounds of a `between`, or `undefined` when either is missing. */
  getPair: _getPair,

  /**
   * Coerces one value to the literal type the column wants, so numeric columns
   * bind as numbers rather than quoted strings. Values that cannot be coerced
   * are returned unchanged; `validateFilterRule` is what reports them to the
   * user.
   *
   * An unknown column type passes the value through untouched so rules without
   * `columnDataType` still render as untyped literals.
   */
  makeLiteral: _makeLiteral,
};
