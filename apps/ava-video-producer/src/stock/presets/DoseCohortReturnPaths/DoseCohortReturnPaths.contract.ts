import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./DoseCohortReturnPaths.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./DoseCohortReturnPaths.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./DoseCohortReturnPaths.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free typed content contract. */
export const doseCohortReturnPathsContract = {
  id: "dose-cohort-return-paths",
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
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
