import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./LinkedParameterRehearsal.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./LinkedParameterRehearsal.schema";
export { controls } from "./LinkedParameterRehearsal.controls";
/** Public retrieval copy excludes private planning provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored display-copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["source", "label"],
  ["source", "unit"],
  ["outputs", 0, "label"],
  ["outputs", 0, "unit"],
  ["outputs", 1, "label"],
  ["outputs", 1, "unit"],
  ["outputs", 2, "label"],
  ["outputs", 2, "unit"],
  ["phaseLabels", "baseline"],
  ["phaseLabels", "trial"],
  ["phaseLabels", "restored"],
  ["contextLabel"],
];
/** Complete fictional source binding. */
export const BINDING_EXAMPLES: Array<{
  sourceText: { id: string; message: string };
  input: Input;
}> = [
  {
    sourceText: {
      id: "motionAtlas.linked-parameter-rehearsal.bindingExamples.0.sourceText",
      message:
        "In a fictional workshop, trying four batches instead of two doubles parts from six to twelve and reduces reserve credits from eight to four. One booked room stays fixed. Reverting the assumption restores the starting quantities.",
    },
    input: {
      source: {
        label: "Workshop batches",
        baseline: 2,
        trial: 4,
        min: 0,
        max: 5,
        unit: "batches",
      },
      outputs: [
        {
          id: "parts",
          label: "Parts needed",
          multiplier: 3,
          offset: 0,
          min: 0,
          max: 15,
          unit: "parts",
        },
        {
          id: "reserve",
          label: "Reserve remaining",
          multiplier: -2,
          offset: 12,
          min: 0,
          max: 12,
          unit: "credits",
        },
        {
          id: "rooms",
          label: "Booked rooms",
          multiplier: 0,
          offset: 1,
          min: 0,
          max: 3,
          unit: "rooms",
        },
      ],
      phaseLabels: {
        baseline: "Two-batch assumption",
        trial: "Try four batches",
        restored: "Two-batch values restored",
      },
      showRules: true,
      showBaselineMarkers: true,
      contextLabel: "Fictional workshop arithmetic, not a forecast",
    },
  },
];
