/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type { ValuePickerRuleType } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";

export { ValuePickerRuleModule as ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRuleModule/ValuePickerRuleModule.ts";

export namespace ValuePickerRule {
  /** One of the rules that reduce a field's rows to one value. */
  export type T = ValuePickerRuleType;
}
