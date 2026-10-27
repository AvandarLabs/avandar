import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./CommunityCoordinationTable.fixtures";
import authoredMetadata from "./CommunityCoordinationTable.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./CommunityCoordinationTable.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["places", 0, "label"],
  ["places", 0, "requestLabel"],
  ["places", 1, "label"],
  ["places", 1, "requestLabel"],
  ["places", 2, "label"],
  ["places", 2, "requestLabel"],
  ["teams", 0, "label"],
  ["teams", 0, "serviceLabel"],
  ["teams", 1, "label"],
  ["teams", 1, "serviceLabel"],
  ["communityLabel"],
  ["planLabels", "initial"],
  ["planLabels", "agreed"],
  ["planLabels", "unassigned"],
  ["scenarioCaption"],
];
/** Complete source binding with all authored input fields. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.community-coordination-table.bindingExamples.0.sourceText",
      message:
        "In a fictional community meeting, two information teams initially share area A; one agrees to move to the request in area B while area C remains unassigned.",
    },
    input: DEFAULT_INPUT,
  },
];
