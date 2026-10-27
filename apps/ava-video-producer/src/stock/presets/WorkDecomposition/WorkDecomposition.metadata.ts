import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./WorkDecomposition.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./WorkDecomposition.schema";

export { controls } from "./WorkDecomposition.controls";
/** Public retrieval copy excludes private planning provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored display-copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["parentLabel"],
  ["workItems", 0, "label"],
  ["workItems", 1, "label"],
  ["workItems", 2, "label"],
  ["unitLabel"],
  ["groupingLabel"],
];
/** Complete fictional source binding. */
export const BINDING_EXAMPLES: Array<{
  sourceText: { id: string; message: string };
  input: Input;
}> = [
  {
    sourceText: {
      id: "motionAtlas.work-decomposition.bindingExamples.0.sourceText",
      message:
        "A fictional release is broken into drafting, review, and packaging, with three, two, and one illustrative effort units respectively.",
    },
    input: {
      parentLabel: "Sample release",
      workItems: [
        {
          id: "draft",
          label: "Draft",
          effort: 3,
        },
        {
          id: "review",
          label: "Review",
          effort: 2,
        },
        {
          id: "package",
          label: "Package",
          effort: 1,
        },
      ],
      unitLabel: "effort units",
      groupingLabel: "Work packages",
      showEffortValues: true,
      partitionLayout: "alternating-cuts",
    },
  },
];
