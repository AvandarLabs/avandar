import { controls } from "./OrderedLockAcquisition.controls";
import { DEFAULT_INPUT, FIXTURES } from "./OrderedLockAcquisition.fixtures";
import { METADATA } from "./OrderedLockAcquisition.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./OrderedLockAcquisition.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const orderedLockAcquisitionContract = {
  id: "ordered-lock-acquisition",
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
    ["resources", 0, "label"],
    ["resources", 1, "label"],
    ["operations", 0, "label"],
    ["operations", 1, "label"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.ordered-lock-acquisition.bindingExamples.0.sourceText",
        message:
          "Operation 1 asks for Table A then B; Operation 2 asks for B then A. Both acquire in canonical A-then-B order, with Operation 1 taking the first turn.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
