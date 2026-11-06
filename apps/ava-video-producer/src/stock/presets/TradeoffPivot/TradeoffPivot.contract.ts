import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./TradeoffPivot.fixtures";
import {
  metadata,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./TradeoffPivot.metadata";
import { inputSchema, SEMANTIC_RULES } from "./TradeoffPivot.schema";
import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./TradeoffPivot.schema";

/** Complete versioned content contract, independent from renderer imports. */
export const tradeoffPivotContract = {
  id: "tradeoff-pivot",
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
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;
