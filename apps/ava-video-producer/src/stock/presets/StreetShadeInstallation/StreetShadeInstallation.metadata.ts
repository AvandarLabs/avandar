import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./StreetShadeInstallation.fixtures";
import authoredMetadata from "./StreetShadeInstallation.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./StreetShadeInstallation.controls";
/** Public retrieval descriptors contain no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["zones", 0, "label"],
  ["zones", 1, "label"],
  ["installations", 0, "label"],
  ["installations", 1, "label"],
  ["referenceCondition"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "map"],
  ["copy", "existing"],
  ["copy", "added"],
  ["copy", "shaded"],
  ["copy", "unshaded"],
  ["copy", "proposal"],
  ["copy", "installed"],
  ["copy", "unit"],
  ["copy", "disclaimer"],
];
/** Complete binding, never a partial patch. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.street-shade-installation.bindingExample",
      message:
        "A fictional design places an awning and a canopy footprint over two waiting spaces, adding 60 square metres of nonoverlapping shade to the existing 40.",
    },
    input: DEFAULT_INPUT,
  },
];
