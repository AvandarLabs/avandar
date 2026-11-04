import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./PublicationSnapshotSlice.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./PublicationSnapshotSlice.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./PublicationSnapshotSlice.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free versioned authored-content contract. */
export const publicationSnapshotSliceContract = {
  id: "publication-snapshot-slice",
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
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
