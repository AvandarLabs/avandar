import { CONTROLS } from "./ContributionWeave.controls";
import { DEFAULT_INPUT, fixtures } from "./ContributionWeave.fixtures";
import { METADATA } from "./ContributionWeave.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ContributionWeave.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Complete renderer-free contract for this authored animation. */
export const contributionWeaveContract = {
  id: "contribution-weave",
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
    ["warp", 0, "label"],
    ["warp", 1, "label"],
    ["weft", 0, "label"],
    ["weft", 1, "label"],
    ["copy", "result"],
    ["copy", "example"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.contribution-weave.bindingExamples.0.sourceText",
        message:
          "The fictional field guide brings structure, facts, wording, and layout together, while each team's contribution remains identifiable in the shared result.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
