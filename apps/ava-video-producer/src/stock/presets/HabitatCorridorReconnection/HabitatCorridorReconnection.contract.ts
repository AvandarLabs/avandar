import { z } from "zod";
import {
  DEFAULT_INPUT,
  fixtures,
} from "./HabitatCorridorReconnection.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./HabitatCorridorReconnection.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
} from "./HabitatCorridorReconnection.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./HabitatCorridorReconnection.schema";
/** Versioned renderer-free contract for the named scene. */
export const habitatCorridorReconnectionContract = {
  id: "habitat-corridor-reconnection",
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
