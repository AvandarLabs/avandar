import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./SealedHandoff.fixtures";
import {
  metadata,
  CONTROLS,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./SealedHandoff.metadata";
import { inputSchema, SEMANTIC_RULES } from "./SealedHandoff.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./SealedHandoff.schema";
/** Versioned data-only assembly for the named renderer. */
export const sealedHandoffContract = {
  id: "sealed-handoff",
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
