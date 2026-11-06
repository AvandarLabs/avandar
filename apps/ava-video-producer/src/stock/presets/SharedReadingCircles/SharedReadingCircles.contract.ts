import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./SharedReadingCircles.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./SharedReadingCircles.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SharedReadingCircles.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free scene contract. */
export const sharedReadingCirclesContract = {
  id: "shared-reading-circles",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "social-sector",
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
