import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./ReturningLearnerWorktable.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ReturningLearnerWorktable.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ReturningLearnerWorktable.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free scene contract. */
export const returningLearnerWorktableContract = {
  id: "returning-learner-worktable",
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
