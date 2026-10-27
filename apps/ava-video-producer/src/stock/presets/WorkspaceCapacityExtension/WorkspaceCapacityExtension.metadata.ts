import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./WorkspaceCapacityExtension.fixtures";
import authoredMetadata from "./WorkspaceCapacityExtension.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./WorkspaceCapacityExtension.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for visible default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["existingResources", 0, "label"],
  ["existingResources", 1, "label"],
  ["existingResources", 2, "label"],
  ["requestedResources", 0, "label"],
  ["requestedResources", 1, "label"],
  ["allowances", "currentAllowance", "label"],
  ["allowances", "expandedAllowance", "label"],
  ["choice", "label"],
  ["copy", "workspace"],
  ["copy", "pending"],
  ["copy", "capacity"],
  ["copy", "retained"],
  ["copy", "example"],
];
/** Complete fictional authored binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.workspace-capacity-extension.bindingExamples.0.sourceText",
      message:
        "A fictional workspace has three resource slots and three existing resources. Its team requests two more, chooses a five-slot allowance, and keeps the original three while seating the two pending requests. Keeping the current allowance leaves both requests pending.",
    },
    input: DEFAULT_INPUT,
  },
];
