import { match } from "ts-pattern";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { DatasetColumnMappings } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings.ts";
import type { ValuePickerRuleType } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";

/** A value rule applied to a column of one Ava data type. */
type RuleOnColumn = Readonly<{
  ruleType: ValuePickerRuleType;
  columnDataType: AvaDataType.T;
}>;

/** The rule every column type allows, used in place of one that is not. */
const DEFAULT_RULE_TYPE: ValuePickerRuleType = "most_frequent";

/**
 * The type of the value a rule produces from a column. `first`,
 * `most_frequent`, `max`, and `min` return one of the column's own values,
 * so they keep its type. `sum` and `avg` return a decimal, and `count` a
 * whole number.
 *
 * It does not check that the rule is allowed for the column. Use
 * `isAllowedForColumnType` for that.
 */
function getOutputDataType(options: RuleOnColumn): AvaDataType.T {
  return match(options.ruleType)
    .with("first", "most_frequent", "max", "min", () => {
      return options.columnDataType;
    })
    .with("sum", "avg", () => {
      return "double" as const;
    })
    .with("count", () => {
      return "bigint" as const;
    })
    .exhaustive();
}

/**
 * Whether a rule can be applied to a column of this type. `sum` and `avg`
 * need numbers. `max` and `min` work on every type except yes/no values,
 * where "largest" means nothing to a reader. On text they compare
 * alphabetically, so "10" comes before "9".
 */
function isAllowedForColumnType(options: RuleOnColumn): boolean {
  return match(options.ruleType)
    .with("first", "most_frequent", "count", () => {
      return true;
    })
    .with("max", "min", () => {
      return options.columnDataType !== "boolean";
    })
    .with("sum", "avg", () => {
      return AvaDataType.isNumeric(options.columnDataType);
    })
    .exhaustive();
}

/**
 * The rules a column of this type allows, in the order option lists show
 * them.
 */
function getAllowedRuleTypes(
  options: Readonly<{ columnDataType: AvaDataType.T }>,
): ValuePickerRuleType[] {
  return DatasetColumnMappings.ValuePickerTypes.filter((ruleType) => {
    return isAllowedForColumnType({
      ruleType,
      columnDataType: options.columnDataType,
    });
  });
}

/**
 * The rule itself when the column's type allows it, otherwise
 * `DEFAULT_RULE_TYPE`.
 */
function toAllowedRuleType(options: RuleOnColumn): ValuePickerRuleType {
  return isAllowedForColumnType(options) ? options.ruleType : DEFAULT_RULE_TYPE;
}

/**
 * The value rule table: what type each rule emits, and which column types
 * each rule may be applied to.
 */
export const ValuePickerRuleModule = {
  DEFAULT_RULE_TYPE,
  getOutputDataType,
  isAllowedForColumnType,
  getAllowedRuleTypes,
  toAllowedRuleType,
};
