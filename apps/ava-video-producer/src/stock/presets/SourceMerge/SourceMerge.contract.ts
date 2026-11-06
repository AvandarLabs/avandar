import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  sourceMergeDefaultInput,
  sourceMergeFixtures,
} from "./SourceMerge.fixtures";
import {
  sourceMergeMetadata,
  SOURCE_MERGE_DEFAULT_TEXT_PATHS,
} from "./SourceMerge.metadata";
import { sourceMergeInputSchema } from "./SourceMerge.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const sourceMergeContract: StockContract<
  typeof sourceMergeDefaultInput
> = makeLegacyContractFromDefinition({
  id: "source-merge",
  inputSchema: sourceMergeInputSchema,
  defaultInput: sourceMergeDefaultInput,
  fixtures: sourceMergeFixtures,
  metadata: sourceMergeMetadata,
  defaultTextPaths: SOURCE_MERGE_DEFAULT_TEXT_PATHS,
  semanticRules: [],
});
