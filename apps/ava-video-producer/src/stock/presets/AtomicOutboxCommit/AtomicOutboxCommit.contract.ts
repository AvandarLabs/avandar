import { controls } from "./AtomicOutboxCommit.controls";
import { DEFAULT_INPUT, fixtures } from "./AtomicOutboxCommit.fixtures";
import { METADATA } from "./AtomicOutboxCommit.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./AtomicOutboxCommit.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete typed renderer-free contract. */
export const atomicOutboxCommitContract = {
  id: "atomic-outbox-commit",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls,
  defaultTextPaths: [
    ["change", "recordLabel"],
    ["labels", "local"],
    ["labels", "outbox"],
    ["labels", "pending"],
    ["labels", "committed"],
    ["labels", "aborted"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.atomic-outbox-commit.bindingExamples.0.sourceText",
        message:
          "Change the stock note from Count 2 to Count 3 and create delivery ticket edit-a in the same commit. The pending ticket survives with the local edit.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
