import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./PooledDonorAllocation.fixtures";
import authoredMetadata from "./PooledDonorAllocation.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./PooledDonorAllocation.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["requests", 0, "label"],
  ["requests", 1, "label"],
  ["contributions", 0, "donorLabel"],
  ["contributions", 0, "mark"],
  ["contributions", 1, "donorLabel"],
  ["contributions", 1, "mark"],
  ["contributions", 2, "donorLabel"],
  ["contributions", 2, "mark"],
  ["labels", "coordinator"],
  ["labels", "pool"],
  ["labels", "earmarked"],
  ["labels", "flexible"],
  ["labels", "allocated"],
  ["labels", "remaining"],
  ["labels", "unit"],
  ["scenarioCaption"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.pooled-donor-allocation.bindingExamples.0.sourceText",
      message:
        "Three fictional donors pool ten demo credits: four are earmarked for food transport, three for shelter access, and three are flexible; nine are allocated and one flexible credit remains.",
    },
    input: DEFAULT_INPUT,
  },
];
