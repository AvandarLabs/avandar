import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./ProtectedWorkBoundary.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ProtectedWorkBoundary.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ProtectedWorkBoundary.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content contract. */
export const protectedWorkBoundaryContract = {
  id: "protected-work-boundary",
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
