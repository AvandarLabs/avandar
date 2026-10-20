import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { DEFAULT_INPUT, fixtures } from "./ExpertiseRoleExchange.fixtures";
import { METADATA } from "./ExpertiseRoleExchange.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ExpertiseRoleExchange.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract and recursive editor data. */
export const expertiseRoleExchangeContract = {
  id: "expertise-role-exchange",
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
    messageNamespace: "motionAtlas.expertise-role-exchange",
    referenceSelects: {
      "topics.expertId": { path: "people", valueKey: "id", labelKey: "label" },
    },
  }),
  defaultTextPaths: [
    ["people", 0, "label"],
    ["people", 0, "roleLabel"],
    ["people", 1, "label"],
    ["people", 1, "roleLabel"],
    ["topics", 0, "label"],
    ["topics", 1, "label"],
    ["labels", "demonstrates"],
    ["labels", "learns"],
    ["labels", "example"],
    ["closingLabel"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.expertise-role-exchange.bindingExamples.0.sourceText",
        message:
          "In a fictional workshop, Mara demonstrates document layout and Eli demonstrates workshop marking. Each learns from the other while their organizational roles stay unchanged.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
