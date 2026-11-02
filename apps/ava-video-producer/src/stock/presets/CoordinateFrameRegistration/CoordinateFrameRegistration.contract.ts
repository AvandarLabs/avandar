import { z } from "zod";
import { controls } from "./CoordinateFrameRegistration.controls";
import {
  DEFAULT_INPUT,
  fixtures,
} from "./CoordinateFrameRegistration.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./CoordinateFrameRegistration.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./CoordinateFrameRegistration.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free validated authoring contract. */
export const coordinateFrameRegistrationContract = {
  id: "coordinate-frame-registration",
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
