import { CONTROLS } from "./CustodyTransfer.controls";
import { DEFAULT_INPUT, fixtures } from "./CustodyTransfer.fixtures";
import { METADATA } from "./CustodyTransfer.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./CustodyTransfer.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Complete renderer-free contract for this authored animation. */
export const custodyTransferContract = {
  id: "custody-transfer",
  schemaVersion: 1,
  metadataVersion: 2,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls: CONTROLS,
  defaultTextPaths: [
    ["holders", "sender"],
    ["holders", "recipient"],
    ["object", "label"],
    ["object", "details", 0],
    ["object", "details", 1],
    ["copy", "offered"],
    ["copy", "accepted"],
    ["copy", "waiting"],
    ["copy", "responsible"],
    ["copy", "example"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.custody-transfer.bindingExamples.0.sourceText",
        message:
          "In this fictional shift handoff, the morning team retains the brief until the evening team accepts responsibility.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
