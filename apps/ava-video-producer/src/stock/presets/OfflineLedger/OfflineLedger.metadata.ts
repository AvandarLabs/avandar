import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./OfflineLedger.fixtures";
import authoredMetadata from "./OfflineLedger.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
  StockMessageDescriptor,
} from "../../contracts/StockContract.types";

export { CONTROLS } from "./OfflineLedger.controls";

function _message({
  key,
  message,
}: {
  key: string;
  message: string;
}): StockMessageDescriptor {
  return { id: `motionAtlas.offline-ledger.${key}`, message };
}

/**
 * Public retrieval copy preserves accepted intent without private provenance.
 */
export const metadata: StockMetadata = parseStockMetadata(authoredMetadata);

/**
 * Explicit numeric paths cover all visible default copy across the timeline.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["entries", 0, "label"],
  ["entries", 0, "value"],
  ["entries", 1, "label"],
  ["entries", 1, "value"],
  ["entries", 2, "label"],
  ["entries", 2, "value"],
  ["surfaceLabel"],
  ["copy", "connected"],
  ["copy", "offline"],
  ["copy", "storage"],
  ["copy", "retained"],
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
        "In our fictional field-notes example, staff keep recording observations when reception disappears, and each entry remains on the tablet.",
    }),
    input: DEFAULT_INPUT,
  },
];
