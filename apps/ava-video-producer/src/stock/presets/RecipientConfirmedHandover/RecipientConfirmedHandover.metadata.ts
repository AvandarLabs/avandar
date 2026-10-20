import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./RecipientConfirmedHandover.fixtures";
import authoredMetadata from "./RecipientConfirmedHandover.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./RecipientConfirmedHandover.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["contents", 0, "label"],
  ["contents", 1, "label"],
  ["contents", 2, "label"],
  ["participantLabels", "recipient"],
  ["participantLabels", "deliveryTeam"],
  ["receiptLabels", "heading"],
  ["receiptLabels", "acknowledgement"],
  ["receiptLabels", "recipientCopy"],
  ["receiptLabels", "teamCopy"],
  ["receiptLabels", "offered"],
  ["receiptLabels", "selected"],
  ["receiptLabels", "retained"],
  ["initialsText"],
  ["scenarioCaption"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.recipient-confirmed-handover.bindingExamples.0.sourceText",
      message:
        "In a fictional handover, a household representative chooses and counts two grain packs and one blanket, leaves the soap packs, and keeps a receipt for the selected goods.",
    },
    input: DEFAULT_INPUT,
  },
];
