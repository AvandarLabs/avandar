import { z } from "zod";
import { controls } from "./FilterSubscriptionScope.controls";
import { DEFAULT_INPUT, fixtures } from "./FilterSubscriptionScope.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  BINDING_EXAMPLES,
} from "./FilterSubscriptionScope.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./FilterSubscriptionScope.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content and editor contract. */
export const filterSubscriptionScopeContract = {
  id: "filter-subscription-scope",
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
  bindingExamples: BINDING_EXAMPLES,
} satisfies StockContract<Input>;
