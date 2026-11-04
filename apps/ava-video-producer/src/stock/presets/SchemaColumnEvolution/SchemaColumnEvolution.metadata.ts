import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SchemaColumnEvolution.fixtures";
import authoredMetadata from "./SchemaColumnEvolution.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./SchemaColumnEvolution.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for visible default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["earlierRecords", 0, "label"],
  ["earlierRecords", 0, "recordedValue"],
  ["earlierRecords", 1, "label"],
  ["earlierRecords", 1, "recordedValue"],
  ["fields", "existingLabel"],
  ["fields", "addedLabel"],
  ["fields", "missingLabel"],
  ["laterRecord", "label"],
  ["laterRecord", "recordedValue"],
  ["laterRecord", "addedValue"],
  ["phaseLabels", "before"],
  ["phaseLabels", "expanded"],
  ["phaseLabels", "later"],
  ["evidenceLabel"],
];
/** Complete fictional authored binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.schema-column-evolution.bindingExamples.0.sourceText",
      message:
        "A fictional outreach form initially records a site. It later adds visit mode. Two earlier records retain not-collected visit modes, while a new East record supplies In person.",
    },
    input: DEFAULT_INPUT,
  },
];
