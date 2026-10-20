import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./TermLimitedRevenueShare.fixtures";
import authoredMetadata from "./TermLimitedRevenueShare.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./TermLimitedRevenueShare.controls";
/** Public descriptors with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored default prose path, including nested review copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["periods", 0, "label"],
  ["periods", 1, "label"],
  ["arrangement", "label"],
  ["arrangement", "termBoundaryLabel"],
  ["money", "unitLabel"],
  ["copy", "receipts"],
  ["copy", "operating"],
  ["copy", "distribution"],
  ["copy", "retained"],
  ["copy", "example"],
];
/** Complete authored example, preserved verbatim. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.term-limited-revenue-share.binding",
      message:
        "Two fictional periods each receive 100 demo credits and spend 60 on operating outflow. A temporary distribution of 10 percent sends 10 credits out in period A and leaves 30 retained. The authored term has ended in period B, so no distribution leaves and 40 are retained. These are separate period flows, not an accumulated balance.",
    },
    input: DEFAULT_INPUT,
  },
];
