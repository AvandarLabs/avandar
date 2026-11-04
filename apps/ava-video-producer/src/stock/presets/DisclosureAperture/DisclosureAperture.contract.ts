import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./DisclosureAperture.fixtures";
import {
  metadata,
  CONTROLS,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./DisclosureAperture.metadata";
import { inputSchema, SEMANTIC_RULES } from "./DisclosureAperture.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./DisclosureAperture.schema";
/** Versioned data-only assembly for the named renderer. */
export const disclosureApertureContract = {
  id: "disclosure-aperture",
  schemaVersion: 1,
  metadataVersion: 2,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata,
  controls: CONTROLS,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
