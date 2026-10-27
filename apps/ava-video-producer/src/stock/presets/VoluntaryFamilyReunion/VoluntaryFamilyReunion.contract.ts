import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./VoluntaryFamilyReunion.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./VoluntaryFamilyReunion.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./VoluntaryFamilyReunion.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored content contract. */
export const voluntaryFamilyReunionContract = {
  id: "voluntary-family-reunion",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "social-sector",
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
