import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./ArgumentBridge.fixtures";
import {
  METADATA,
  CONTROLS,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ArgumentBridge.metadata";
import { inputSchema, SEMANTIC_RULES } from "./ArgumentBridge.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ArgumentBridge.schema";
/** Complete versioned content contract, independent of renderer imports. */
export const argumentBridgeContract = {
  id: "argument-bridge",
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
  controls: CONTROLS,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
