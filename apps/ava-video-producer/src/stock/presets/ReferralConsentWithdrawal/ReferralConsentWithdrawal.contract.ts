import { z } from "zod";
import { controls } from "./ReferralConsentWithdrawal.controls";
import { DEFAULT_INPUT, fixtures } from "./ReferralConsentWithdrawal.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ReferralConsentWithdrawal.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ReferralConsentWithdrawal.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored content contract. */
export const referralConsentWithdrawalContract = {
  id: "referral-consent-withdrawal",
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
