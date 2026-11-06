import { z } from "zod";
import {
  DEFAULT_INPUT,
  fixtures,
} from "./ReferralReturnAcknowledgement.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ReferralReturnAcknowledgement.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ReferralReturnAcknowledgement.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content contract. */
export const referralReturnAcknowledgementContract = {
  id: "referral-return-acknowledgement",
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
