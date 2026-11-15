import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./JournalReceipts.fixtures";
import authoredMetadata from "./JournalReceipts.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
  StockMessageDescriptor,
} from "../../contracts/StockContract.types";

export { CONTROLS } from "./JournalReceipts.controls";

function _message({
  key,
  message,
}: {
  key: string;
  message: string;
}): StockMessageDescriptor {
  return { id: `motionAtlas.journal-receipts.${key}`, message };
}

/**
 * Public retrieval copy preserves accepted intent without private provenance.
 */
export const metadata: StockMetadata = parseStockMetadata(authoredMetadata);

/**
 * Explicit numeric paths cover all visible default copy across the timeline.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["entries", 0, "id"],
  ["entries", 0, "label"],
  ["entries", 1, "id"],
  ["entries", 1, "label"],
  ["entries", 2, "id"],
  ["entries", 2, "label"],
  ["receipts", 0, "entryId"],
  ["receipts", 0, "label"],
  ["receipts", 1, "entryId"],
  ["receipts", 1, "label"],
  ["copy", "journal"],
  ["copy", "receiptPocket"],
  ["copy", "disconnected"],
  ["copy", "reconnected"],
  ["copy", "pending"],
  ["copy", "acknowledged"],
  ["copy", "example"],
];

/** Complete fictional binding, validated without inference. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: _message({
      key: "bindingExamples.0.sourceText",
      message:
        "In the fictional notebook, reconnection brings receipts for notes A and B; note C stays in the local pending journal until its receipt arrives.",
    }),
    input: DEFAULT_INPUT,
  },
];
