import { defaultInput, fixtures } from "./DecisionFork.fixtures";
import {
  metadata,
  decisionForkControls,
  DECISION_FORK_DEFAULT_TEXT_PATHS,
  decisionForkBindingExamples,
} from "./DecisionFork.metadata";
import {
  inputSchema,
  decisionForkJsonSchema,
  DECISION_FORK_SEMANTIC_RULES,
} from "./DecisionFork.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./DecisionFork.schema";

/** Complete content-only contract reuses every accepted DecisionFork module. */
export const decisionForkContract = {
  id: "decision-fork",
  schemaVersion: 1,
  metadataVersion: 2,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: decisionForkJsonSchema,
  semanticRules: DECISION_FORK_SEMANTIC_RULES,
  defaultInput,
  fixtures,
  metadata,
  controls: decisionForkControls,
  defaultTextPaths: DECISION_FORK_DEFAULT_TEXT_PATHS,
  bindingExamples: decisionForkBindingExamples,
} satisfies StockContract<Input>;
