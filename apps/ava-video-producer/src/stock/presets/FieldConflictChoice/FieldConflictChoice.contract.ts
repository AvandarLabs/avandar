import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./FieldConflictChoice.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./FieldConflictChoice.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./FieldConflictChoice.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete versioned content contract independent of rendering modules. */
export const fieldConflictChoiceContract = {
  id: "field-conflict-choice",
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
