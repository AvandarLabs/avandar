import { CONTROLS } from "./ScheduleBuffer.controls";
import { DEFAULT_INPUT, FIXTURES } from "./ScheduleBuffer.fixtures";
import { METADATA } from "./ScheduleBuffer.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ScheduleBuffer.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored animation contract. */
export const scheduleBufferContract = {
  id: "schedule-buffer",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  metadata: METADATA,
  controls: CONTROLS,
  defaultTextPaths: [
    ["tasks", 0, "label"],
    ["tasks", 1, "label"],
    ["tasks", 2, "label"],
    ["interruption", "label"],
    ["scheduleLabels", "reserve"],
    ["scheduleLabels", "deadline"],
    ["unitLabel"],
    ["resultLabel"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.schedule-buffer.bindingExamples.0.sourceText",
        message:
          "A fictional delivery plan reserves two slots, so an extra one-slot review pass can shift later work without moving delivery.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
