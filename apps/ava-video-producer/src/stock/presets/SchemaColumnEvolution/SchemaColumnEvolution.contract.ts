import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./SchemaColumnEvolution.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./SchemaColumnEvolution.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SchemaColumnEvolution.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete content contract without rendering dependencies. */
export const schemaColumnEvolutionContract = {
  id: "schema-column-evolution",
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
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
