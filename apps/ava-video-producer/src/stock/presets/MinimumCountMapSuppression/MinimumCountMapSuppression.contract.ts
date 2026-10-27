import { z } from "zod";
import { controls } from "./MinimumCountMapSuppression.controls";
import { DEFAULT_INPUT, fixtures } from "./MinimumCountMapSuppression.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./MinimumCountMapSuppression.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./MinimumCountMapSuppression.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free validated authoring contract. */
export const minimumCountMapSuppressionContract = {
  id: "minimum-count-map-suppression",
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
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
