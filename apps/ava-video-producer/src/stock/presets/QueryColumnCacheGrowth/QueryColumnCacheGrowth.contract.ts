import { controls } from "./QueryColumnCacheGrowth.controls";
import { DEFAULT_INPUT, FIXTURES } from "./QueryColumnCacheGrowth.fixtures";
import { METADATA } from "./QueryColumnCacheGrowth.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./QueryColumnCacheGrowth.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const queryColumnCacheGrowthContract = {
  id: "query-column-cache-growth",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  metadata: METADATA,
  controls: controls,
  defaultTextPaths: [
    ["columns", 0, "label"],
    ["columns", 1, "label"],
    ["columns", 2, "label"],
    ["requests", 0, "label"],
    ["requests", 1, "label"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.query-column-cache-growth.bindingExamples.0.sourceText",
        message:
          "The cache holds Key and Name for three rows. Read Name from it, then request Key and Items. Replace the cache with Key, Name and Items while retaining both repeated B rows.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
