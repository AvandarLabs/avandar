import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./PopulationNormalizedMap.fixtures";
import authoredMetadata from "./PopulationNormalizedMap.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every authored default label. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["zones", 0, "label"],
  ["zones", 1, "label"],
  ["periodLabel"],
  ["copy", "context"],
  ["copy", "countLegend"],
  ["copy", "normalizedLegend"],
  ["copy", "records"],
  ["copy", "population"],
  ["copy", "per"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.population-normalized-map.bindingExample",
      message:
        "Demo West has four records among forty residents; Demo East has three among ten, so their counts and population-normalized values tell different stories.",
    },
    input: defaultInput,
  },
];
