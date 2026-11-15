import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./UncertaintyUnfold.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./UncertaintyUnfold.schema";

export { controls } from "./UncertaintyUnfold.controls";
/** Public retrieval copy excludes private planning provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored display-copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["estimate", "label"],
  ["axis", "unit"],
  ["interval", "label"],
  ["reference", "label"],
  ["interpretation"],
  ["contextLabel"],
];
/** Complete fictional source binding. */
export const BINDING_EXAMPLES: Array<{
  sourceText: { id: string; message: string };
  input: Input;
}> = [
  {
    sourceText: {
      id: "motionAtlas.uncertainty-unfold.bindingExamples.0.sourceText",
      message:
        "In a fictional workshop plan, preparation is estimated at five hours with an illustrative range of three to eight hours. The six-hour allowance falls inside that range.",
    },
    input: {
      estimate: {
        label: "Workshop preparation",
        point: 5,
        lower: 3,
        upper: 8,
      },
      axis: {
        min: 0,
        max: 10,
        unit: "hours",
      },
      interval: {
        kind: "scenario-range",
        label: "Illustrative planning range",
      },
      reference: {
        value: 6,
        label: "Preparation allowance",
      },
      interpretation: "The range spans the six-hour allowance.",
      showValues: true,
      contextLabel: "Fictional workshop example",
    },
  },
];
