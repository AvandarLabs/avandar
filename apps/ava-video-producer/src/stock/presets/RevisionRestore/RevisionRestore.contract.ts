import { CONTROLS } from "./RevisionRestore.controls";
import { DEFAULT_INPUT, FIXTURES } from "./RevisionRestore.fixtures";
import { METADATA } from "./RevisionRestore.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./RevisionRestore.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored animation contract. */
export const revisionRestoreContract = {
  id: "revision-restore",
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
    ["revisions", 0, "label"],
    ["revisions", 0, "content", 0],
    ["revisions", 0, "content", 1],
    ["revisions", 1, "label"],
    ["revisions", 1, "content", 0],
    ["revisions", 1, "content", 1],
    ["revisions", 2, "label"],
    ["revisions", 2, "content", 0],
    ["revisions", 2, "content", 1],
    ["artifactLabel"],
    ["statusLabels", "current"],
    ["statusLabels", "restored"],
    ["statusLabels", "history"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.revision-restore.bindingExamples.0.sourceText",
        message:
          "In fictional sample notes, restoring Draft A brings back its open questions while Drafts B and C remain in saved history.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
