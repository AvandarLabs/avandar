import { makeStockJsonSchemaFromZodSchema } from "../../contracts/makeStockJsonSchemaFromZodSchema/makeStockJsonSchemaFromZodSchema";
import { controls } from "./GeometryDetailBudget.controls";
import { DEFAULT_INPUT, fixtures } from "./GeometryDetailBudget.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./GeometryDetailBudget.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./GeometryDetailBudget.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free validated authoring contract. */
export const geometryDetailBudgetContract = {
  id: "geometry-detail-budget",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
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
