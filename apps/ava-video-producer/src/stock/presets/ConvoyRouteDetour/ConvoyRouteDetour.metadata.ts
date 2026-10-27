import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ConvoyRouteDetour.fixtures";
import authoredMetadata from "./ConvoyRouteDetour.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { controls } from "./ConvoyRouteDetour.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["locations", "depotLabel"],
  ["locations", "destinationLabel"],
  ["locations", "junctionLabel"],
  ["routes", 0, "label"],
  ["routes", 1, "label"],
  ["obstruction", "label"],
  ["scenarioCaption"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.convoy-route-detour.bindingExamples.0.sourceText",
      message:
        "In the fictional Willow exercise, a closed bridge sends the aid truck along an agreed alternative road to the same reception point.",
    },
    input: DEFAULT_INPUT,
  },
];
