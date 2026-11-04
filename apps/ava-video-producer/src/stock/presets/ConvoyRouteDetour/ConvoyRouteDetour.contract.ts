import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./ConvoyRouteDetour.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ConvoyRouteDetour.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ConvoyRouteDetour.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content contract. */
export const convoyRouteDetourContract = {
  id: "convoy-route-detour",
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
