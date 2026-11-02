import { z } from "zod";
import { controls } from "./SavedSeedSeasonReturn.controls";
import { defaultInput, fixtures } from "./SavedSeedSeasonReturn.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./SavedSeedSeasonReturn.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SavedSeedSeasonReturn.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const savedSeedSeasonReturnContract = {
  id: "saved-seed-season-return",
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
