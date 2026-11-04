import { z } from "zod";
import { controls } from "./BoundedLocationDisplacement.controls";
import {
  DEFAULT_INPUT,
  fixtures,
} from "./BoundedLocationDisplacement.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./BoundedLocationDisplacement.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./BoundedLocationDisplacement.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authoring contract. */
export const boundedLocationDisplacementContract = {
  id: "bounded-location-displacement",
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
