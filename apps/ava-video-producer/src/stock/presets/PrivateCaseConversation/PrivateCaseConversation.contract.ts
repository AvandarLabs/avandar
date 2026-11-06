import { z } from "zod";
import { controls } from "./PrivateCaseConversation.controls";
import { DEFAULT_INPUT, fixtures } from "./PrivateCaseConversation.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./PrivateCaseConversation.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./PrivateCaseConversation.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored content contract. */
export const privateCaseConversationContract = {
  id: "private-case-conversation",
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
