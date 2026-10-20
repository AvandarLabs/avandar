import { z } from "zod";
import { controls } from "./InterpretedCaseDialogue.controls";
import { defaultInput, fixtures } from "./InterpretedCaseDialogue.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./InterpretedCaseDialogue.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./InterpretedCaseDialogue.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const interpretedCaseDialogueContract = {
  id: "interpreted-case-dialogue",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "social-sector",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput,
  fixtures,
  metadata: METADATA,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
