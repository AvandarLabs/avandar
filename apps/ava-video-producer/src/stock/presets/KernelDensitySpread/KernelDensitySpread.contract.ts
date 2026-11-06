import { z } from "zod";
import { controls } from "./KernelDensitySpread.controls";
import { DEFAULT_INPUT, fixtures } from "./KernelDensitySpread.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./KernelDensitySpread.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./KernelDensitySpread.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authoring contract. */
export const kernelDensitySpreadContract = {
  id: "kernel-density-spread",
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
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
