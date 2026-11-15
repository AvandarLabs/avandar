import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./LinkedParameterRehearsal.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  BINDING_EXAMPLES,
} from "./LinkedParameterRehearsal.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./LinkedParameterRehearsal.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete typed renderer-free content contract. */
export const linkedParameterRehearsalContract = {
  id: "linked-parameter-rehearsal",
  schemaVersion: 1,
  metadataVersion: 2,
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
