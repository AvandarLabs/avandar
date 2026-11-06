import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./ComponentMaterialReturn.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ComponentMaterialReturn.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ComponentMaterialReturn.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free contract for the authored study. */
export const componentMaterialReturnContract = {
  id: "component-material-return",
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
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
