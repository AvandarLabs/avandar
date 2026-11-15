import { controls } from "./InvalidTableQuarantine.controls";
import { DEFAULT_INPUT, FIXTURES } from "./InvalidTableQuarantine.fixtures";
import { METADATA } from "./InvalidTableQuarantine.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./InvalidTableQuarantine.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const invalidTableQuarantineContract = {
  id: "invalid-table-quarantine",
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
    ["labels", "readable"],
    ["labels", "invalid"],
    ["labels", "blocked"],
    ["labels", "reload"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.invalid-table-quarantine.bindingExamples.0.sourceText",
        message:
          "Before changing B from 4 to 9, close reads. The attempt fails. Reload the complete rows A:2, B:4 and C:3 before reopening the table.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
