import { z } from "zod";
import { controls } from "./PublicWorksMeasurementCheck.controls";
import { defaultInput, fixtures } from "./PublicWorksMeasurementCheck.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./PublicWorksMeasurementCheck.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./PublicWorksMeasurementCheck.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const publicWorksMeasurementCheckContract = {
  id: "public-works-measurement-check",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "social-sector",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput,
  fixtures,
  metadata: METADATA,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
