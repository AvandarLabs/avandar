import { makeStockJsonSchemaFromZodSchema } from "../../contracts/makeStockJsonSchemaFromZodSchema/makeStockJsonSchemaFromZodSchema";
import { controls } from "./PopulationNormalizedMap.controls";
import { defaultInput, fixtures } from "./PopulationNormalizedMap.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./PopulationNormalizedMap.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./PopulationNormalizedMap.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content and editing contract. */
export const populationNormalizedMapContract = {
  id: "population-normalized-map",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "social-sector",
  loopFrames: 180,
  inputSchema,
  jsonSchema: makeStockJsonSchemaFromZodSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput,
  fixtures,
  metadata: METADATA,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
