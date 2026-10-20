import { z } from "zod";
import { controls } from "./ResidentBudgetBallots.controls";
import { DEFAULT_INPUT, fixtures } from "./ResidentBudgetBallots.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ResidentBudgetBallots.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ResidentBudgetBallots.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored content contract. */
export const residentBudgetBallotsContract = {
  id: "resident-budget-ballots",
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
