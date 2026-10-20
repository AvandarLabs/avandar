import { controls } from "./SchemaPlanLocalExecution.controls";
import { DEFAULT_INPUT, FIXTURES } from "./SchemaPlanLocalExecution.fixtures";
import { METADATA } from "./SchemaPlanLocalExecution.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SchemaPlanLocalExecution.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const schemaPlanLocalExecutionContract = {
  id: "schema-plan-local-execution",
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
  controls: controls,
  defaultTextPaths: [
    ["columns", "category"],
    ["columns", "measure"],
    ["request", "question"],
    ["request", "planLabel"],
    ["boundaryLabels", "local"],
    ["boundaryLabels", "remote"],
    ["boundaryLabels", "outbound"],
    ["boundaryLabels", "inbound"],
    ["boundaryLabels", "result"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.schema-plan-local-execution.bindingExamples.0.sourceText",
        message:
          "Send column names Team and Items with the question Total items for North. Run the returned filter-and-sum plan locally over North 2, South 5 and North 3; keep the result 5 on the device.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
