import { match } from "ts-pattern";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type {
  ConceptAttributeId,
  ConceptAttributeModel,
  ConceptAttributeValueShape,
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
 * The columns a case type's view emits besides its fields: the record key
 * and the status. Lowercased, because DuckDB compares column names without
 * case. The record key's name is the view's `external_id` column.
 */
const RESERVED_VIEW_COLUMN_NAMES: readonly string[] = [
  "external_id",
  ConceptStatusColumn.COLUMN_NAME.toLowerCase(),
];

type NamedField = Readonly<Pick<ConceptAttributeModel["Read"], "id" | "name">>;

function _compareInViewOrder(left: NamedField, right: NamedField): number {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
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
): Map<ConceptAttributeId, string> {
  const takenNames = new Set(RESERVED_VIEW_COLUMN_NAMES);
  const columnNamesById = new Map<ConceptAttributeId, string>();
  [...attributes].sort(_compareInViewOrder).forEach((attribute) => {
    const columnName = _getUniqueColumnName({
      requestedName: attribute.name,
      takenNames,
    });
    takenNames.add(columnName.toLowerCase());
    columnNamesById.set(attribute.id, columnName);
  });
  return columnNamesById;
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
   * Orders fields the way a case type's view orders its columns: by name,
   * then by id. Use it wherever fields are listed in column order, for
   * example on the record page.
   */
  compareInViewOrder: _compareInViewOrder,

  /**
   * The column a case type's view emits for each field, by field id. A
   * field's column is its name, suffixed (`_2`, `_3`) when the record key,
   * the status, or an earlier field in view order already took that name
   * without regard to case. Use it wherever SQL reads a field's column, for
   * example when the view is built or a structured query selects a field.
   */
  getViewColumnNames: _getViewColumnNames,
};
