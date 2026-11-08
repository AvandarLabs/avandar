import { match } from "ts-pattern";
import { ConceptModule } from "$/models/ontology/Concept/ConceptModule.ts";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type {
  ConceptAttributeId,
  ConceptAttributeModel,
  ConceptAttributeValueShape,
  ConceptAttributeViewColumn,
} from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";

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
