import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./WorkDecomposition.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  BINDING_EXAMPLES,
} from "./WorkDecomposition.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./WorkDecomposition.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete typed renderer-free content contract. */
export const workDecompositionContract = {
  id: "work-decomposition",
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
