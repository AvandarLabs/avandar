import { CONTROLS } from "./BatchRelease.controls";
import { DEFAULT_INPUT, FIXTURES } from "./BatchRelease.fixtures";
import { METADATA } from "./BatchRelease.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./BatchRelease.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored animation contract. */
export const batchReleaseContract = {
  id: "batch-release",
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
  controls: CONTROLS,
  defaultTextPaths: [
    ["batches", 0, "label"],
    ["batches", 0, "items", 0, "label"],
    ["batches", 0, "items", 1, "label"],
    ["batches", 0, "items", 2, "label"],
    ["intakeLabel"],
    ["boundaryLabel"],
    ["destinationLabel"],
    ["releaseLabel"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.batch-release.bindingExamples.0.sourceText",
        message:
          "In a fictional collection workflow, items A, B, and C arrive separately and are dispatched together once Bundle A is complete.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
