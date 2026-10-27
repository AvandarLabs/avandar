import { z } from "zod";
import { controls } from "./PersonLedSupportCalendar.controls";
import { DEFAULT_INPUT, fixtures } from "./PersonLedSupportCalendar.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./PersonLedSupportCalendar.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./PersonLedSupportCalendar.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content contract. */
export const personLedSupportCalendarContract = {
  id: "person-led-support-calendar",
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
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;
