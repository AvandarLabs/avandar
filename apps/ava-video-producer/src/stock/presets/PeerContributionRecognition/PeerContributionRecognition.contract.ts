import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import {
  DEFAULT_INPUT,
  fixtures,
} from "./PeerContributionRecognition.fixtures";
import { METADATA } from "./PeerContributionRecognition.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./PeerContributionRecognition.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract and recursive editor data. */
export const peerContributionRecognitionContract = {
  id: "peer-contribution-recognition",
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
  controls: makeStockControlsFromSchema({
    schema: jsonSchema,
    messageNamespace: "motionAtlas.peer-contribution-recognition",
    referenceSelects: {
      focusedContributionId: {
        path: "contributions",
        valueKey: "id",
        labelKey: "label",
      },
    },
  }),
  defaultTextPaths: [
    ["people", "contributor"],
    ["people", "colleague"],
    ["contributions", 0, "label"],
    ["acknowledgment", "text"],
    ["exampleLabel"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.peer-contribution-recognition.bindingExamples.0.sourceText",
        message:
          "In a fictional team, Jo thanks Rin for making a clear setup guide. The acknowledgment refers to that guide and retains Rin as its author.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
