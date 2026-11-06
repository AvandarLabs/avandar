import { controls } from "./StatePreservingSourceRefresh.controls";
import {
  DEFAULT_INPUT,
  FIXTURES,
} from "./StatePreservingSourceRefresh.fixtures";
import { METADATA } from "./StatePreservingSourceRefresh.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./StatePreservingSourceRefresh.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const statePreservingSourceRefreshContract = {
  id: "state-preserving-source-refresh",
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
  controls,
  defaultTextPaths: [
    ["records", 0, "label"],
    ["records", 0, "status"],
    ["records", 0, "assignee"],
    ["records", 1, "label"],
    ["records", 1, "status"],
    ["records", 1, "assignee"],
    ["records", 2, "label"],
    ["records", 2, "status"],
    ["records", 2, "assignee"],
    ["sourceRows", 0, "label"],
    ["sourceRows", 1, "label"],
    ["labels", "derived"],
    ["labels", "human"],
    ["labels", "unchanged"],
    ["labels", "missing"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.state-preserving-source-refresh.bindingExamples.0.sourceText",
        message:
          "Refresh Site A to Site A North, leave Site B unchanged and flag Site C as missing from the source. Preserve each record ID, worker and human status.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
