import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./SavedSeedSeasonReturn.fixtures";
import authoredMetadata from "./SavedSeedSeasonReturn.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval and display descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for default visible copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["crop", "label"],
  ["crop", "unitLabel"],
  ["cultivator", "label"],
  ["cultivator", "choiceLabel"],
  ["seasons", "harvestLabel"],
  ["seasons", "storageLabel"],
  ["seasons", "plantingLabel"],
  ["balanceLabels", "currentUse"],
  ["balanceLabels", "reserved"],
  ["balanceLabels", "storageLoss"],
  ["balanceLabels", "sown"],
  ["balanceLabels", "remaining"],
  ["evidenceLabel"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.saved-seed-season-return.binding",
      message:
        "In this fictional example, the Oak household keeps 4 kg from a 12 kg bean harvest for planting and sets 8 kg aside for current household use. Across the interval it records 1 kg of seed storage loss, later sows 2 kg back into the same plot, and retains 1 kg in the jar. No next-season yield is specified.",
    },
    input: defaultInput,
  },
];
