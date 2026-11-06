import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ActorAttributionSplit.fixtures";
import authoredMetadata from "./ActorAttributionSplit.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ActorAttributionSplit.controls";
/** Public descriptors with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored default prose path, including nested review copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["collaborators", 0, "label"],
  ["collaborators", 1, "label"],
  ["accounts", 0, "label"],
  ["accounts", 1, "label"],
  ["accounts", 2, "label"],
  ["events", 0, "label"],
  ["events", 1, "label"],
  ["events", 2, "label"],
  ["events", 3, "label"],
  ["copy", "shared"],
  ["copy", "individual"],
  ["copy", "choice"],
  ["copy", "historyLimit"],
  ["copy", "ledger"],
  ["copy", "example"],
];
/** Complete authored example, preserved verbatim. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.actor-attribution-split.binding",
      message:
        "Two fictional editors initially record Draft opened and Note added under one shared demo account. After choosing separate demo accounts, their later actions receive account A and account B stamps. The earlier records keep the shared label.",
    },
    input: DEFAULT_INPUT,
  },
];
