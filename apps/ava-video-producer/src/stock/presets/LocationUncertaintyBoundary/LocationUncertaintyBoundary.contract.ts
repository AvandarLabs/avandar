import { makeStockJsonSchemaFromZodSchema } from "../../contracts/makeStockJsonSchemaFromZodSchema/makeStockJsonSchemaFromZodSchema";
import { controls } from "./LocationUncertaintyBoundary.controls";
import {
  DEFAULT_INPUT,
  fixtures,
} from "./LocationUncertaintyBoundary.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./LocationUncertaintyBoundary.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./LocationUncertaintyBoundary.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content contract. */
export const locationUncertaintyBoundaryContract = {
  id: "location-uncertainty-boundary",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "social-sector",
  loopFrames: 180,
  inputSchema,
  jsonSchema: makeStockJsonSchemaFromZodSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
