import { match } from "ts-pattern";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { ValuePickerRuleType } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";
import type {
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
    ruleType: ValuePickerRuleType;
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
};
