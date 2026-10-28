import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ReportPageBind.fixtures";
import authoredMetadata from "./ReportPageBind.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./ReportPageBind.controls";
/** Public retrieval descriptors preserve accepted intent and limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every default display-copy segment. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["reportTitle"],
  ["sections", 0, "heading"],
  ["sections", 0, "body"],
  ["sections", 1, "heading"],
  ["sections", 1, "body"],
  ["byline"],
  ["destinationLabel"],
  ["formatLabel"],
];
/** Complete fictional source binding independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.report-page-bind.bindingExamples.0.sourceText",
      message:
        "The fictional planning team packages its inventory notes as a two-page PDF for the team reading tray.",
    },
    input: DEFAULT_INPUT,
  },
];
