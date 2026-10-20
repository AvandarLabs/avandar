import { CONTROLS } from "./ReadinessLatch.controls";
import { DEFAULT_INPUT, fixtures } from "./ReadinessLatch.fixtures";
import { METADATA } from "./ReadinessLatch.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ReadinessLatch.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Complete renderer-free contract for this authored animation. */
export const readinessLatchContract = {
  id: "readiness-latch",
  schemaVersion: 1,
  metadataVersion: 2,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls: CONTROLS,
  defaultTextPaths: [
    ["participants", 0, "label"],
    ["participants", 1, "label"],
    ["participants", 2, "label"],
    ["sharedAction"],
    ["copy", "ready"],
    ["copy", "waiting"],
    ["copy", "held"],
    ["copy", "released"],
    ["copy", "example"],
    ["unitLabel"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.readiness-latch.bindingExamples.0.sourceText",
        message:
          "In the fictional theater cue, the curtain waits until lights, sound, and stage have each marked themselves ready.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
