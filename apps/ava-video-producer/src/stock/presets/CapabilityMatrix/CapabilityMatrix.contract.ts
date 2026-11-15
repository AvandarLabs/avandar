import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./CapabilityMatrix.fixtures";
import {
  metadata,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./CapabilityMatrix.metadata";
import { inputSchema, SEMANTIC_RULES } from "./CapabilityMatrix.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./CapabilityMatrix.schema";

/** Complete versioned content contract, independent from renderer imports. */
export const capabilityMatrixContract = {
  id: "capability-matrix",
  schemaVersion: 1,
  metadataVersion: 2,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata,
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
