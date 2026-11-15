import { z } from "zod";
import { controls } from "./ShelterUsableAreaCapacity.controls";
import { DEFAULT_INPUT, fixtures } from "./ShelterUsableAreaCapacity.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ShelterUsableAreaCapacity.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ShelterUsableAreaCapacity.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content contract. */
export const shelterUsableAreaCapacityContract = {
  id: "shelter-usable-area-capacity",
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
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
