import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./PairedContrast.fixtures";
import {
  metadata,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./PairedContrast.metadata";
import { inputSchema, SEMANTIC_RULES } from "./PairedContrast.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./PairedContrast.schema";

/** Complete versioned content contract, independent from renderer imports. */
export const pairedContrastContract = {
  id: "paired-contrast",
  schemaVersion: 1,
  metadataVersion: 2,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata,
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
