import { makeStockJsonSchemaFromZodSchema } from "../../contracts/makeStockJsonSchemaFromZodSchema/makeStockJsonSchemaFromZodSchema";
import { controls } from "./CatchmentUnionGaps.controls";
import { defaultInput, fixtures } from "./CatchmentUnionGaps.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./CatchmentUnionGaps.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./CatchmentUnionGaps.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content and editing contract. */
export const catchmentUnionGapsContract = {
  id: "catchment-union-gaps",
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
