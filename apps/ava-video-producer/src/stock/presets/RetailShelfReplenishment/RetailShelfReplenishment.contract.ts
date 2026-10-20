import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./RetailShelfReplenishment.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./RetailShelfReplenishment.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./RetailShelfReplenishment.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored content contract. */
export const retailShelfReplenishmentContract = {
  id: "retail-shelf-replenishment",
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
