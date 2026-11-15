import { z } from "zod";
import { controls } from "./LateTypeEvidence.controls";
import { DEFAULT_INPUT, fixtures } from "./LateTypeEvidence.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./LateTypeEvidence.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./LateTypeEvidence.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authoring contract. */
export const lateTypeEvidenceContract = {
  id: "late-type-evidence",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
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
