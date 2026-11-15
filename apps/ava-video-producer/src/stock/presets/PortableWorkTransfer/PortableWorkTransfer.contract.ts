import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { DEFAULT_INPUT, FIXTURES } from "./PortableWorkTransfer.fixtures";
import { METADATA } from "./PortableWorkTransfer.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./PortableWorkTransfer.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const portableWorkTransferContract = {
  id: "portable-work-transfer",
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
    messageNamespace: "motionAtlas.portable-work-transfer",
  }),
  defaultTextPaths: [
    ["ownerLabel"],
    ["tools", "source"],
    ["tools", "destination"],
    ["artifacts", 0, "label"],
    ["artifacts", 1, "label"],
    ["labels", "originals"],
    ["labels", "copies"],
    ["labels", "portable"],
    ["labels", "received"],
    ["labels", "pending"],
    ["labels", "example"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.portable-work-transfer.bindingExamples.0.sourceText",
        message:
          "A fictional project owner retains notes in Tool A and carries same-ID copies to Tool B. The destination is explicitly shown opening the folio in this authored example.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
