import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { DEFAULT_INPUT, fixtures } from "./RecurringLeakPrevention.fixtures";
import { METADATA } from "./RecurringLeakPrevention.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./RecurringLeakPrevention.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract and recursive editor data. */
export const recurringLeakPreventionContract = {
  id: "recurring-leak-prevention",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls: makeStockControlsFromSchema({
    schema: jsonSchema,
    messageNamespace: "motionAtlas.recurring-leak-prevention",
  }),
  defaultTextPaths: [
    ["fixtureLabel"],
    ["workerLabel"],
    ["repair", "label"],
    ["labels", "containment"],
    ["labels", "repair"],
    ["labels", "test"],
    ["labels", "stopped"],
    ["labels", "continued"],
    ["labels", "untested"],
    ["labels", "example"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.recurring-leak-prevention.bindingExamples.0.sourceText",
        message:
          "A fictional team first catches a leak, then replaces a joint seal. One illustrated retest shows the normal outlet running without a side leak; it does not prove permanent reliability.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
