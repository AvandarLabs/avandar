import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./SharedFoundation.fixtures";
import {
  METADATA,
  CONTROLS,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./SharedFoundation.metadata";
import { inputSchema, SEMANTIC_RULES } from "./SharedFoundation.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./SharedFoundation.schema";
/** Complete versioned content contract, independent of renderer imports. */
export const sharedFoundationContract = {
  id: "shared-foundation",
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
