import { z } from "zod";
import { controls } from "./SpatialGridBinning.controls";
import { DEFAULT_INPUT, fixtures } from "./SpatialGridBinning.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./SpatialGridBinning.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SpatialGridBinning.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free validated authoring contract. */
export const spatialGridBinningContract = {
  id: "spatial-grid-binning",
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
