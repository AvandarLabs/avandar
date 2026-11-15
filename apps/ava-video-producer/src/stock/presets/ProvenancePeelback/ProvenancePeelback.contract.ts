import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./ProvenancePeelback.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ProvenancePeelback.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ProvenancePeelback.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete versioned content contract, without renderer dependencies. */
export const provenancePeelbackContract = {
  id: "provenance-peelback",
  schemaVersion: 1,
  metadataVersion: 2,
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
