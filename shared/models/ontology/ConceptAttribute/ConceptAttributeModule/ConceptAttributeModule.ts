import { isDefined, registry } from "@avandar/utils";
import { match } from "ts-pattern";
import { ConceptModule } from "$/models/ontology/Concept/ConceptModule.ts";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type {
  ConceptAttributeBucketedListEntry,
  ConceptAttributeBucketGrain,
  ConceptAttributeId,
  ConceptAttributeModel,
  ConceptAttributeValueShape,
  ConceptAttributeViewColumn,
} from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A period's first day as `YYYY-MM-DD`, read in UTC, or `undefined` for a
 * value that is not a date. A DuckDB `DATE` that arrives as a number is epoch
 * milliseconds at UTC midnight, so reading it in local time would move it a
 * day back for anyone west of UTC.
 */
function _toBucketDate(bucket: unknown): string | undefined {
  if (typeof bucket === "string") {
    return ISO_DATE_PATTERN.test(bucket) ? bucket : undefined;
  }
  const epochMilliseconds =
    bucket instanceof Date
      ? bucket.getTime()
      : typeof bucket === "number"
        ? bucket
        : Number.NaN;
  return Number.isFinite(epochMilliseconds)
    ? new Date(epochMilliseconds).toISOString().slice(0, 10)
    : undefined;
}

/** One `{ bucket, value }` struct, or `undefined` for anything else. */
function _toBucketedListEntry(
  item: unknown,
): ConceptAttributeBucketedListEntry | undefined {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return undefined;
  }
  if (
    Object.keys(item).length !== 2 ||
    !("bucket" in item) ||
    !("value" in item)
  ) {
    return undefined;
  }
  const bucket = _toBucketDate(item.bucket);
  return bucket === undefined ? undefined : { bucket, value: item.value };
}

function _valueShapeToIsArray(valueShape: ConceptAttributeValueShape): boolean {
  return match(valueShape)
    .with("single", () => {
      return false;
    })
    .with("list", () => {
      return true;
    })
    .exhaustive();
}

function _getOutputDataType(
  options: Readonly<{
    valueShape: ConceptAttributeValueShape;
    ruleType: ValuePickerRule.T;
    columnDataType: AvaDataType.T;
  }>,
): AvaDataType.T {
  return match(options.valueShape)
    .with("single", () => {
      return ValuePickerRule.getOutputDataType({
        ruleType: options.ruleType,
        columnDataType: options.columnDataType,
      });
    })
    .with("list", () => {
      // A list holds the column's own values, so one value has its type.
      return options.columnDataType;
    })
    .exhaustive();
}

/**
 * The columns a case type's view emits besides its fields: the record key and
 * the status. Lowercased, because DuckDB compares column names without case.
 * A field named like either is suffixed rather than dropped, so it keeps a
 * column of its own. The `concept_attributes__name_not_reserved` check keeps
 * `status` out of the database, but nothing reserves `external_id`, a common
 * key column name.
 */
const RESERVED_VIEW_COLUMN_NAMES: readonly string[] = [
  ConceptModule.RECORD_KEY_COLUMN_NAME,
  ConceptModule.STATUS_COLUMN_NAME.toLowerCase(),
];

/**
 * The locale names are compared in. Fixed, so the browser and Deno order the
 * same names the same way and the same field keeps the plain name everywhere.
 */
const NAME_COMPARISON_LOCALE = "en";

type NamedField = Readonly<Pick<ConceptAttributeModel["Read"], "id" | "name">>;

function _compareInViewOrder(left: NamedField, right: NamedField): number {
  return (
    left.name.localeCompare(right.name, NAME_COMPARISON_LOCALE) ||
    left.id.localeCompare(right.id, NAME_COMPARISON_LOCALE)
  );
}

/**
 * `<name>`, or `<name>_2`, `<name>_3`, and so on when an earlier column took
 * it. `takenNames` holds lowercased names. The result keeps the field's
 * casing.
 */
function _getUniqueColumnName(
  options: Readonly<{ requestedName: string; takenNames: ReadonlySet<string> }>,
): string {
  if (!options.takenNames.has(options.requestedName.toLowerCase())) {
    return options.requestedName;
  }
  let suffix = 2;
  while (
    options.takenNames.has(`${options.requestedName}_${suffix}`.toLowerCase())
  ) {
    suffix += 1;
  }
  return `${options.requestedName}_${suffix}`;
}

function _getViewColumnNames(
  attributes: readonly NamedField[],
): Map<ConceptAttributeId, ConceptAttributeViewColumn> {
  const takenNames = new Set(RESERVED_VIEW_COLUMN_NAMES);
  const earlierFieldNames = new Set<string>();
  const viewColumnsById = new Map<
    ConceptAttributeId,
    ConceptAttributeViewColumn
  >();
  [...attributes].sort(_compareInViewOrder).forEach((attribute) => {
    const columnName = _getUniqueColumnName({
      requestedName: attribute.name,
      takenNames,
    });
    // An earlier field with the same name already claimed it as a result
    // name, and DuckDB would read both result columns as one. A reserved name
    // is no field's result name, so it leaves the field's own.
    const hasTwin = earlierFieldNames.has(attribute.name.toLowerCase());
    takenNames.add(columnName.toLowerCase());
    earlierFieldNames.add(attribute.name.toLowerCase());
    viewColumnsById.set(attribute.id, {
      columnName,
      resultName: hasTwin ? columnName : attribute.name,
    });
  });
  return viewColumnsById;
}

/**
 * Reads and derives a case type field's value shape. Use it wherever a field
 * is designed, stored, or read, for example to decide a new field's stored
 * `is_array` and `data_type`, or whether a query column is a list.
 */
export const ConceptAttributeModule = {
  /**
   * Every period a per-period field can keep one value for, in the database
   * enum's order. Read by the model's parser, the chat parser and tool
   * schema, and the pickers that offer a period.
   */
  BUCKET_GRAINS: registry<ConceptAttributeBucketGrain>().keys(
    "day",
    "week",
    "month",
    "quarter",
    "year",
  ),

  /**
   * Whether a dataset column of this type can place rows in a period. Used
   * by the pickers that offer a date column and by the concept view's column
   * resolution. A `time` column has no calendar date, so it is refused, even
   * though `AvaDataType.isDateOrTimestamp` accepts it.
   */
  isBucketDateColumnType: (dataType: AvaDataType.T): boolean => {
    return dataType === "date" || dataType === "timestamp";
  },

  /**
   * Reads a per-period field's value as a reader received it from DuckDB: a
   * list of `{ bucket, value }` structs. Returns the entries in the order
   * given (the view orders them by period), or `undefined` for a value of any
   * other shape, so a caller can fall back to plain text. A bucket may be a
   * `YYYY-MM-DD` string (as the query result reader returns it), a `Date`, or
   * epoch milliseconds, and always comes back as `YYYY-MM-DD` in UTC. For
   * example, the record page renders the entries as a table, and the Data
   * Explorer grid as one line of text.
   */
  toBucketedListEntries: (
    value: unknown,
  ): ConceptAttributeBucketedListEntry[] | undefined => {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const entries = value.map(_toBucketedListEntry);
    return entries.every(isDefined) ? entries : undefined;
  },

  /** A field's value shape, read from its stored columns. */
  getValueShape: (
    attribute: Readonly<Pick<ConceptAttributeModel["Read"], "isArray">>,
  ): ConceptAttributeValueShape => {
    return attribute.isArray ? "list" : "single";
  },

  /** The stored `is_array` for a value shape. */
  valueShapeToIsArray: _valueShapeToIsArray,

  /**
   * The `data_type` a dataset-column field stores: the type of one value as
   * the concept view emits it. `ruleType` is what the field's draft holds;
   * a list ignores it.
   */
  getOutputDataType: _getOutputDataType,

  /**
   * The order in which fields claim column names: by name, then by id. The
   * same field keeps the plain name on every run, so a later field is the one
   * suffixed when two share a name. The view itself orders its columns by the
   * name each one is emitted under. Use it wherever fields are listed in the
   * view's claim order, for example on the record page.
   */
  compareInViewOrder: _compareInViewOrder,

  /**
   * The names a case type's view gives each field, by field id. `columnName`
   * is the field's name, suffixed (`_2`, `_3`) when the record key, the
   * status, or an earlier field in view order already took that name without
   * regard to case. `resultName` is the name the field's value carries in a
   * query result: the field's own name, unless an earlier field has the same
   * name, in which case it is `columnName`. Use it wherever SQL reads or
   * names a field's column, for example when the view is built or a
   * structured query selects a field.
   */
  getViewColumnNames: _getViewColumnNames,
};
