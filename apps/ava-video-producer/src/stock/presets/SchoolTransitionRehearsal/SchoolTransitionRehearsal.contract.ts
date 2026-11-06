import { z } from "zod";
import { controls } from "./SchoolTransitionRehearsal.controls";
import { defaultInput, fixtures } from "./SchoolTransitionRehearsal.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./SchoolTransitionRehearsal.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SchoolTransitionRehearsal.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const schoolTransitionRehearsalContract = {
  id: "school-transition-rehearsal",
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
