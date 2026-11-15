import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./VoluntaryFamilyReunion.fixtures";
import authoredMetadata from "./VoluntaryFamilyReunion.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./VoluntaryFamilyReunion.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["groups", 0, "label"],
  ["groups", 0, "members", 0, "label"],
  ["groups", 0, "members", 1, "label"],
  ["groups", 1, "label"],
  ["groups", 1, "members", 0, "label"],
  ["meetingLabel"],
  ["invitationLabels", "heading"],
  ["invitationLabels", "acceptance"],
  ["scenarioCaption"],
];
/** Complete source binding with all authored input fields. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.voluntary-family-reunion.bindingExamples.0.sourceText",
      message:
        "Two fictional family groups each agree to meet, walk to the community meeting place, and greet one another.",
    },
    input: DEFAULT_INPUT,
  },
];
