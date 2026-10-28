import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ColdChainCustody.fixtures";
import authoredMetadata from "./ColdChainCustody.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { controls } from "./ColdChainCustody.controls";
/** Public retrieval descriptors without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Exact indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["stops", 0, "label"],
  ["stops", 1, "label"],
  ["stops", 2, "label"],
  ["crates", 0, "label"],
  ["crates", 1, "label"],
  ["crates", 2, "label"],
  ["sceneLabel"],
  ["copy", "schematic"],
  ["copy", "total"],
  ["copy", "logged"],
  ["copy", "review"],
  ["copy", "missing"],
  ["copy", "arrival"],
  ["copy", "acknowledged"],
  ["copy", "receiptMissing"],
  ["copy", "sealIntact"],
  ["copy", "sealBroken"],
  ["copy", "sealUnknown"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.cold-chain-custody.bindingExamples.0.sourceText",
      message:
        "In this fictional delivery, three vaccine containers arrive at Hill clinic, but only one has a final monitoring record marked logged.",
    },
    input: DEFAULT_INPUT,
  },
];
