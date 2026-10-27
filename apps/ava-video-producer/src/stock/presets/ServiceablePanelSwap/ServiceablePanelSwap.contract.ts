import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { DEFAULT_INPUT, FIXTURES } from "./ServiceablePanelSwap.fixtures";
import { METADATA } from "./ServiceablePanelSwap.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ServiceablePanelSwap.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const serviceablePanelSwapContract = {
  id: "serviceable-panel-swap",
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
  controls: makeStockControlsFromSchema({
    schema: jsonSchema,
    messageNamespace: "motionAtlas.serviceable-panel-swap",
    referenceSelects: {
      "replacement.targetModuleId": {
        path: "modules",
        valueKey: "id",
        labelKey: "label",
      },
    },
  }),
  defaultTextPaths: [
    ["modules", 0, "label"],
    ["modules", 1, "label"],
    ["modules", 2, "label"],
    ["replacement", "label"],
    ["workerLabel"],
    ["labels", "whole"],
    ["labels", "changed"],
    ["labels", "retained"],
    ["labels", "removed"],
    ["labels", "example"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.serviceable-panel-swap.bindingExamples.0.sourceText",
        message:
          "In a fictional modular console, a maintainer replaces the control unit through its service opening. The input and output modules remain unchanged, and the removed control remains visible.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
