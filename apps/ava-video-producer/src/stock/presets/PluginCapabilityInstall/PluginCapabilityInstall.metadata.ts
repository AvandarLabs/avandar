import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./PluginCapabilityInstall.fixtures";
import authoredMetadata from "./PluginCapabilityInstall.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./PluginCapabilityInstall.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for visible default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["categories", 0, "label"],
  ["categories", 1, "label"],
  ["utility", "label"],
  ["utility", "fieldLabel"],
  ["utility", "operationLabel"],
  ["installation", "decisionLabel"],
  ["copy", "workspace"],
  ["copy", "records"],
  ["copy", "emptySocket"],
  ["copy", "installed"],
  ["copy", "deferred"],
  ["copy", "result"],
  ["copy", "example"],
];
/** Complete fictional authored binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.plugin-capability-install.bindingExamples.0.sourceText",
      message:
        "A fictional lending team chooses to install a category-count utility. The same four source records produce three Books counts and one Tools count. Deferring installation leaves the source records available and the tool slot empty.",
    },
    input: DEFAULT_INPUT,
  },
];
