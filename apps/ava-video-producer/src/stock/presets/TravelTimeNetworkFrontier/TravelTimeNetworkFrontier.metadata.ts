import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./TravelTimeNetworkFrontier.fixtures";
import authoredMetadata from "./TravelTimeNetworkFrontier.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy and explicit limits. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["nodes", 0, "label"],
  ["nodes", 1, "label"],
  ["nodes", 2, "label"],
  ["nodes", 3, "label"],
  ["modeLabel"],
];
/** Complete accepted fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.travel-time-network-frontier.bindingExample",
      message:
        "From Origin, Stop A costs 3 minutes, Stop B costs 6 via A and Stop C costs 10. A seven-minute walking budget reaches A and B but not C.",
    },
    input: DEFAULT_INPUT,
  },
];
