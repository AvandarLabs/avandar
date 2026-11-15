import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./JournalReceipts.fixtures";
import {
  metadata,
  CONTROLS,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./JournalReceipts.metadata";
import { inputSchema, SEMANTIC_RULES } from "./JournalReceipts.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./JournalReceipts.schema";
/** Versioned data-only assembly for the named renderer. */
export const journalReceiptsContract = {
  id: "journal-receipts",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata,
  controls: CONTROLS,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
