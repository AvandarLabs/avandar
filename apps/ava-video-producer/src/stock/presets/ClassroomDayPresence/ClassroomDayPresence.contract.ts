import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./ClassroomDayPresence.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ClassroomDayPresence.metadata";
import { inputSchema, SEMANTIC_RULES } from "./ClassroomDayPresence.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ClassroomDayPresence.schema";
/** Versioned renderer-free contract for the named scene. */
export const classroomDayPresenceContract = {
  id: "classroom-day-presence",
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
