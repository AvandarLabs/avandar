import { z } from "zod";
import { controls } from "./ParcelSetbackInset.controls";
import { defaultInput, fixtures } from "./ParcelSetbackInset.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ParcelSetbackInset.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ParcelSetbackInset.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content and editing contract. */
export const parcelSetbackInsetContract = {
  id: "parcel-setback-inset",
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
