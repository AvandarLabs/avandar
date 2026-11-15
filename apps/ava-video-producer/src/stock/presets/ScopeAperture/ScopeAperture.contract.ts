import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./ScopeAperture.fixtures";
import {
  METADATA,
  CONTROLS,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ScopeAperture.metadata";
import { inputSchema, SEMANTIC_RULES } from "./ScopeAperture.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ScopeAperture.schema";
/** Complete versioned content contract, independent of renderer imports. */
export const scopeApertureContract = {
  id: "scope-aperture",
  schemaVersion: 1,
  metadataVersion: 2,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls: CONTROLS,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
