import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./DocumentRegionDriftCheck.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./DocumentRegionDriftCheck.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./DocumentRegionDriftCheck.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free versioned authored-content contract. */
export const documentRegionDriftCheckContract = {
  id: "document-region-drift-check",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema, {
    override: ({ jsonSchema }) => {
      if (
        jsonSchema.type === "array" &&
        Array.isArray(jsonSchema.prefixItems)
      ) {
        jsonSchema.minItems = 4;
        jsonSchema.maxItems = 4;
        jsonSchema.items = false;
      }
    },
  }),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
