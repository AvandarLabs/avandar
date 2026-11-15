import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./UtteranceToModelDraft.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./UtteranceToModelDraft.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./UtteranceToModelDraft.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content contract. */
export const utteranceToModelDraftContract = {
  id: "utterance-to-model-draft",
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
  bindingExamples,
} satisfies StockContract<Input>;
