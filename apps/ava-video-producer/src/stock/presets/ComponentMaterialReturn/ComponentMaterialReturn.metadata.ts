import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ComponentMaterialReturn.fixtures";
import authoredMetadata from "./ComponentMaterialReturn.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ComponentMaterialReturn.controls";
/** Public retrieval descriptors contain no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["parts", 0, "label"],
  ["parts", 1, "label"],
  ["parts", 2, "label"],
  ["parts", 3, "label"],
  ["replacementInputs", 0, "label"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "returned"],
  ["copy", "replacement"],
  ["copy", "reuse"],
  ["copy", "repair"],
  ["copy", "recycle"],
  ["copy", "residue"],
  ["copy", "output"],
  ["copy", "unit"],
  ["copy", "disclaimer"],
];
/** Complete binding, never a partial patch. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.component-material-return.bindingExample",
      message:
        "A fictional 10-kilogram returned module contributes 6 kilograms of reused or repaired parts; adding 2 kilograms of replacements leaves an 8-kilogram assembly, 3 kilograms sent to recycling and 1 kilogram of residue.",
    },
    input: DEFAULT_INPUT,
  },
];
