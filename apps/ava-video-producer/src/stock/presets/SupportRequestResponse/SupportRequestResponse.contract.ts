import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { DEFAULT_INPUT, fixtures } from "./SupportRequestResponse.fixtures";
import { METADATA } from "./SupportRequestResponse.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SupportRequestResponse.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract and recursive editor data. */
export const supportRequestResponseContract = {
  id: "support-request-response",
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
    messageNamespace: "motionAtlas.support-request-response",
  }),
  defaultTextPaths: [
    ["people", "requester"],
    ["people", "colleague"],
    ["task", "label"],
    ["requestText"],
    ["response", "text"],
    ["labels", "ownedBy"],
    ["labels", "open"],
    ["labels", "shared"],
    ["labels", "example"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.support-request-response.bindingExamples.0.sourceText",
        message:
          "In a fictional team, Sam asks Lee to check a draft together. Lee agrees and joins the same desk. The work remains Sam's and is not marked complete.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
