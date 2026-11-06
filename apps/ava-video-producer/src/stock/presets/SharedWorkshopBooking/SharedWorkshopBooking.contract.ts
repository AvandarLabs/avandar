import { z } from "zod";
import { controls } from "./SharedWorkshopBooking.controls";
import { defaultInput, fixtures } from "./SharedWorkshopBooking.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./SharedWorkshopBooking.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./SharedWorkshopBooking.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const sharedWorkshopBookingContract = {
  id: "shared-workshop-booking",
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
