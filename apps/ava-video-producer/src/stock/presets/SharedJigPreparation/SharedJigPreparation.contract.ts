import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { DEFAULT_INPUT, FIXTURES } from "./SharedJigPreparation.fixtures";
import { METADATA } from "./SharedJigPreparation.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SharedJigPreparation.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const sharedJigPreparationContract = {
  id: "shared-jig-preparation",
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
  controls: makeStockControlsFromSchema({
    schema: jsonSchema,
    messageNamespace: "motionAtlas.shared-jig-preparation",
  }),
  defaultTextPaths: [
    ["makerLabel"],
    ["guide", "label"],
    ["collaborators", 0, "label"],
    ["collaborators", 0, "workpieceLabel"],
    ["collaborators", 1, "label"],
    ["collaborators", 1, "workpieceLabel"],
    ["labels", "prepare"],
    ["labels", "apply"],
    ["labels", "retained"],
    ["labels", "example"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.shared-jig-preparation.bindingExamples.0.sourceText",
        message:
          "In a fictional workshop, one maker prepares a two-hole marking guide. Ari and Bo use that same guide on separate panels, and the guide remains available afterward.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
