import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ProvenancePeelback.fixtures";
import authoredMetadata from "./ProvenancePeelback.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./ProvenancePeelback.controls";
/** Public retrieval descriptors preserve accepted intent and limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every default display-copy segment. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["summary", "label"],
  ["summary", "text"],
  ["sources", 0, "title"],
  ["sources", 0, "locator"],
  ["sources", 0, "excerpt"],
  ["sources", 1, "title"],
  ["sources", 1, "locator"],
  ["sources", 1, "excerpt"],
  ["citationLabel"],
];
/** Complete fictional source binding independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.provenance-peelback.bindingExamples.0.sourceText",
      message:
        "The fictional stock note cites Row C of the sample register; reveal that passage behind the summary.",
    },
    input: DEFAULT_INPUT,
  },
];
