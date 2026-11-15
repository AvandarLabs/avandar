import { CONTROLS } from "./RetryBackoff.controls";
import { DEFAULT_INPUT, FIXTURES } from "./RetryBackoff.fixtures";
import { METADATA } from "./RetryBackoff.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./RetryBackoff.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored animation contract. */
export const retryBackoffContract = {
  id: "retry-backoff",
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
    ["attempts", 0, "label"],
    ["attempts", 1, "label"],
    ["attempts", 2, "label"],
    ["operationLabel"],
    ["outcomeLabels", "retry"],
    ["outcomeLabels", "complete"],
    ["outcomeLabels", "stop"],
    ["outcomeLabels", "wait"],
    ["delayUnit"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.retry-backoff.bindingExamples.0.sourceText",
        message:
          "In this fictional request sequence, the first retry waits one second, the next waits two seconds, and the third attempt returns the sample.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
