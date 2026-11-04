import { makeStockJsonSchemaFromZodSchema } from "../../contracts/makeStockJsonSchemaFromZodSchema/makeStockJsonSchemaFromZodSchema";
import { DEFAULT_INPUT, fixtures } from "./NestedDrilldownWindow.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./NestedDrilldownWindow.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./NestedDrilldownWindow.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete versioned content contract independent of rendering modules. */
export const nestedDrilldownWindowContract = {
  id: "nested-drilldown-window",
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
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
