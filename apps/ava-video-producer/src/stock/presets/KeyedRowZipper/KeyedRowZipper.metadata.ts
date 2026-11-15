import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./KeyedRowZipper.fixtures";
import authoredMetadata from "./KeyedRowZipper.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./KeyedRowZipper.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for supplied display copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["leftRows", 0, "key"],
  ["leftRows", 0, "value"],
  ["leftRows", 1, "key"],
  ["leftRows", 1, "value"],
  ["leftRows", 2, "key"],
  ["leftRows", 2, "value"],
  ["rightRows", 0, "key"],
  ["rightRows", 0, "value"],
  ["rightRows", 1, "key"],
  ["rightRows", 1, "value"],
  ["rightRows", 2, "key"],
  ["rightRows", 2, "value"],
  ["labels", "title"],
  ["labels", "left"],
  ["labels", "right"],
  ["labels", "key"],
  ["labels", "result"],
  ["labels", "unmatched"],
  ["labels", "missing"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.keyed-row-zipper.bindingExamples.0.sourceText",
      message:
        "Join the fictional item list to its locations by Key, keeping item B even though its location is absent.",
    },
    input: DEFAULT_INPUT,
  },
];
