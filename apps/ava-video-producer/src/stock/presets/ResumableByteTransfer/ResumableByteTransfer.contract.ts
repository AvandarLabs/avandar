import { controls } from "./ResumableByteTransfer.controls";
import { DEFAULT_INPUT, fixtures } from "./ResumableByteTransfer.fixtures";
import { METADATA } from "./ResumableByteTransfer.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ResumableByteTransfer.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete typed renderer-free contract. */
export const resumableByteTransferContract = {
  id: "resumable-byte-transfer",
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
  controls,
  defaultTextPaths: [
    ["file", "label"],
    ["labels", "confirmed"],
    ["labels", "retry"],
    ["labels", "remaining"],
    ["labels", "unit"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.resumable-byte-transfer.bindingExamples.0.sourceText",
        message:
          "A 1200-byte file uses 400-byte chunks. After 400 bytes are acknowledged, an interruption occurs. Resume at byte 400 and finish the remaining 800 bytes.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
