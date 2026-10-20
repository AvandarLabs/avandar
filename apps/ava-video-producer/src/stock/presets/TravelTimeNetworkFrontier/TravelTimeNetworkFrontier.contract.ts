import { z } from "zod";
import { controls } from "./TravelTimeNetworkFrontier.controls";
import { DEFAULT_INPUT, fixtures } from "./TravelTimeNetworkFrontier.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./TravelTimeNetworkFrontier.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./TravelTimeNetworkFrontier.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authoring contract. */
export const travelTimeNetworkFrontierContract = {
  id: "travel-time-network-frontier",
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
