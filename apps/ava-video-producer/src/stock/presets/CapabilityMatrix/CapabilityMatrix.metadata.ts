import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./CapabilityMatrix.fixtures";
import authoredMetadata from "./CapabilityMatrix.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
  StockMessageDescriptor,
} from "../../contracts/StockContract.types";

function _message({
  key,
  message,
}: {
  key: string;
  message: string;
}): StockMessageDescriptor {
  return { id: `motionAtlas.capability-matrix.${key}`, message };
}
/** Public retrieval copy excludes private source provenance. */
export const metadata: StockMetadata = parseStockMetadata(authoredMetadata);
export { controls } from "./CapabilityMatrix.controls";
/** Explicit indexed paths identify visible default copy only. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["options", 0, "label"],
  ["options", 1, "label"],
  ["capabilities", 0, "label"],
  ["capabilities", 0, "cells", 0, "note"],
  ["capabilities", 0, "cells", 1, "note"],
  ["capabilities", 1, "label"],
  ["capabilities", 1, "cells", 0, "note"],
  ["capabilities", 1, "cells", 1, "note"],
  ["capabilities", 2, "label"],
  ["capabilities", 2, "cells", 0, "note"],
  ["capabilities", 2, "cells", 1, "note"],
  ["stateLabels", "included"],
  ["stateLabels", "absent"],
  ["stateLabels", "conditional"],
  ["stateLabels", "unknown"],
  ["caption"],
];
/** A complete fictional binding is validated without source inference. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: _message({
      key: "bindingExamples.0.sourceText",
      message:
        "The fictional pocket and desk kits both contain a pencil, but their ruler and refill options differ.",
    }),
    input: DEFAULT_INPUT,
  },
];
