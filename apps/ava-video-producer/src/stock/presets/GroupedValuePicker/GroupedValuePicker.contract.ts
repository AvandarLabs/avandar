import { controls } from "./GroupedValuePicker.controls";
import { DEFAULT_INPUT, FIXTURES } from "./GroupedValuePicker.fixtures";
import { METADATA } from "./GroupedValuePicker.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./GroupedValuePicker.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const groupedValuePickerContract = {
  id: "grouped-value-picker",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  metadata: METADATA,
  controls,
  defaultTextPaths: [
    ["labels", "entity"],
    ["labels", "field"],
    ["labels", "unit"],
    ["labels", "countUnit"],
    ["labels", "missing"],
    ["labels", "result"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.grouped-value-picker.bindingExamples.0.sourceText",
        message:
          "For one site the ordered values are 2, 4, 4 and missing. Use the most frequent non-missing value, 4, while retaining the observations and the exclusion policy.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
