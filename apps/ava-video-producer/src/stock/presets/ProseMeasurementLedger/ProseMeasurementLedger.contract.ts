import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./ProseMeasurementLedger.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  DEFAULT_SPAN_BINDINGS,
  bindingExamples,
} from "./ProseMeasurementLedger.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ProseMeasurementLedger.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free versioned authored-content contract. */
export const proseMeasurementLedgerContract = {
  id: "prose-measurement-ledger",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  defaultSpanBindings: DEFAULT_SPAN_BINDINGS,
  bindingExamples,
} satisfies StockContract<Input>;
