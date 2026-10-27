import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./RepeatingBlocksToTable.fixtures";
import authoredMetadata from "./RepeatingBlocksToTable.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./RepeatingBlocksToTable.controls";
/** Public retrieval metadata excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["fields", 0, "label"],
  ["fields", 1, "label"],
  ["blocks", 0, "heading"],
  ["blocks", 1, "heading"],
  ["blocks", 0, "cells", 0, "text"],
  ["blocks", 0, "cells", 1, "text"],
  ["blocks", 1, "cells", 0, "text"],
  ["missingLabel"],
  ["copy", "context"],
  ["copy", "source"],
  ["copy", "result"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.repeating-blocks-to-table.bindingExamples.0.sourceText",
      message:
        "Site West lists Action: Repair tap and Need: Spare seal. Site East lists Action: Check pump with no need stated. Make two rows and keep East Need missing.",
    },
    input: DEFAULT_INPUT,
  },
];
