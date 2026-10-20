import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./EqualCountUnequalVolume.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./EqualCountUnequalVolume.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./EqualCountUnequalVolume.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete content contract without rendering dependencies. */
export const equalCountUnequalVolumeContract = {
  id: "equal-count-unequal-volume",
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
