import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./ClusterEpicurveLink.fixtures";
import authoredMetadata from "./ClusterEpicurveLink.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every authored default label. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["cases", 0, "label"],
  ["cases", 1, "label"],
  ["cases", 2, "label"],
  ["cases", 3, "label"],
  ["cases", 4, "label"],
  ["timeBins", 0, "label"],
  ["timeBins", 1, "label"],
  ["timeBins", 2, "label"],
  ["copy", "context"],
  ["copy", "map"],
  ["copy", "curve"],
  ["copy", "unknown"],
  ["copy", "selected"],
  ["copy", "total"],
  ["copy", "unit"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.cluster-epicurve-link.bindingExample",
      message:
        "Review three fictional nearby cases against the onset curve; one has no recorded onset day.",
    },
    input: defaultInput,
  },
];
