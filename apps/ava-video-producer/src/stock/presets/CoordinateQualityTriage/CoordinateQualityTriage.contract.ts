import { z } from "zod";
import { controls } from "./CoordinateQualityTriage.controls";
import { DEFAULT_INPUT, fixtures } from "./CoordinateQualityTriage.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./CoordinateQualityTriage.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./CoordinateQualityTriage.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free validated authoring contract. */
export const coordinateQualityTriageContract = {
  id: "coordinate-quality-triage",
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
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
