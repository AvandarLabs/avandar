import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ReferralConsentWithdrawal.fixtures";
import authoredMetadata from "./ReferralConsentWithdrawal.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public authored retrieval descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed default translation paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["people", "participant"],
  ["people", "worker"],
  ["permissions", 0, "recipient"],
  ["permissions", 0, "purpose"],
  ["permissions", 1, "recipient"],
  ["permissions", 1, "purpose"],
  ["plannedContacts", 0, "label"],
  ["plannedContacts", 1, "label"],
  ["priorRecords", 0, "recipient"],
  ["priorRecords", 0, "dateLabel"],
  ["priorRecords", 0, "summary"],
  ["labels", "permitted"],
  ["labels", "withdrawn"],
  ["labels", "held"],
  ["labels", "history"],
  ["labels", "example"],
];
/** Complete fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.referral-consent-withdrawal.binding",
      message:
        "In a fictional referral discussion, the participant withdraws permission to contact the housing team, so the worker stops the prepared call while keeping the earlier sharing record.",
    },
    input: DEFAULT_INPUT,
  },
];
