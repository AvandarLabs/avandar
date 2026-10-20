import { CONTROLS } from "./CacheReuse.controls";
import { DEFAULT_INPUT, FIXTURES } from "./CacheReuse.fixtures";
import { METADATA } from "./CacheReuse.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./CacheReuse.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored animation contract. */
export const cacheReuseContract = {
  id: "cache-reuse",
  schemaVersion: 1,
  metadataVersion: 2,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  metadata: METADATA,
  controls: CONTROLS,
  defaultTextPaths: [
    ["request", "key"],
    ["request", "label"],
    ["result", "label"],
    ["result", "value"],
    ["systemLabels", "requester"],
    ["systemLabels", "cache"],
    ["systemLabels", "origin"],
    ["pathLabels", "miss"],
    ["pathLabels", "store"],
    ["pathLabels", "hit"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.cache-reuse.bindingExamples.0.sourceText",
        message:
          "A fictional viewer fetches tile 7 once, keeps its result, and answers the second lookup for tile 7 from the stored copy.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
