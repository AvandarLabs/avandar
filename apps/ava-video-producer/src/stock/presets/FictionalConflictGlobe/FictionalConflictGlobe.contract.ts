import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./FictionalConflictGlobe.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./FictionalConflictGlobe.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./FictionalConflictGlobe.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content contract. */
export const fictionalConflictGlobeContract = {
  id: "fictional-conflict-globe",
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
