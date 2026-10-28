import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ReferralReturnAcknowledgement.fixtures";
import authoredMetadata from "./ReferralReturnAcknowledgement.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./ReferralReturnAcknowledgement.controls";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["referrals", 0, "personLabel"],
  ["referrals", 1, "personLabel"],
  ["referrals", 2, "personLabel"],
  ["services", "referring"],
  ["services", "receiving"],
  ["sceneLabel"],
  ["copy", "waiting"],
  ["copy", "attendedOpen"],
  ["copy", "closed"],
  ["copy", "referrals"],
  ["copy", "attendance"],
  ["copy", "returned"],
];
/** A complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.referral-return-acknowledgement.bindingExamples.0.sourceText",
      message:
        "Of three fictional referrals, two people attended the receiving service, but only one acknowledgement returned to the referring clinic.",
    },
    input: DEFAULT_INPUT,
  },
];
