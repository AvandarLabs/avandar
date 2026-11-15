import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./DuplicateReviewStack.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./DuplicateReviewStack.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./DuplicateReviewStack.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete versioned content contract independent of rendering modules. */
export const duplicateReviewStackContract = {
  id: "duplicate-review-stack",
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
