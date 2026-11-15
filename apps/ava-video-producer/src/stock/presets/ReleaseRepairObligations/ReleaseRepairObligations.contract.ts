import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { DEFAULT_INPUT, fixtures } from "./ReleaseRepairObligations.fixtures";
import { METADATA } from "./ReleaseRepairObligations.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ReleaseRepairObligations.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract and recursive editor data. */
export const releaseRepairObligationsContract = {
  id: "release-repair-obligations",
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
    messageNamespace: "motionAtlas.release-repair-obligations",
  }),
  defaultTextPaths: [
    ["artifact", "label"],
    ["issues", 0, "label"],
    ["issues", 0, "owner"],
    ["issues", 0, "dueLabel"],
    ["issues", 1, "label"],
    ["issues", 1, "owner"],
    ["issues", 1, "dueLabel"],
    ["recipientLabel"],
    ["labels", "ready"],
    ["labels", "held"],
    ["labels", "limitations"],
    ["labels", "register"],
    ["labels", "resolved"],
    ["labels", "open"],
    ["labels", "example"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.release-repair-obligations.bindingExamples.0.sourceText",
        message:
          "A fictional workshop guide has its missing setup steps fixed before sharing. An optional index remains open, assigned to Jo for the next review, and stays visible after the guide is delivered.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
