import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./RejectAndReplace.fixtures";
import {
  metadata,
  CONTROLS,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./RejectAndReplace.metadata";
import { inputSchema, SEMANTIC_RULES } from "./RejectAndReplace.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./RejectAndReplace.schema";

/** Complete versioned content contract, independent from renderer imports. */
export const rejectAndReplaceContract = {
  id: "reject-and-replace",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata,
  controls: CONTROLS,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
