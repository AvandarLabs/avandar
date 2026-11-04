import { z } from "zod";
import { controls } from "./SurveillanceReportingBackfill.controls";
import {
  DEFAULT_INPUT,
  fixtures,
} from "./SurveillanceReportingBackfill.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./SurveillanceReportingBackfill.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SurveillanceReportingBackfill.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content contract. */
export const surveillanceReportingBackfillContract = {
  id: "surveillance-reporting-backfill",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "social-sector",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
