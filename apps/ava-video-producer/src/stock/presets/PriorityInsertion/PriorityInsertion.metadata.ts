import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./PriorityInsertion.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./PriorityInsertion.schema";

export { controls } from "./PriorityInsertion.controls";
/** Public retrieval copy excludes private planning provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored display-copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["queue", 0, "label"],
  ["queue", 1, "label"],
  ["queue", 2, "label"],
  ["queue", 3, "label"],
  ["incomingItem", "label"],
  ["priorityLabel"],
  ["serviceLabel"],
];
/** Complete fictional source binding. */
export const BINDING_EXAMPLES: Array<{
  sourceText: { id: string; message: string };
  input: Input;
}> = [
  {
    sourceText: {
      id: "motionAtlas.priority-insertion.bindingExamples.0.sourceText",
      message:
        "In a fictional draft queue, a time-sensitive request is inserted before Draft B; B, C, and D each move back one place while their order is preserved.",
    },
    input: {
      queue: [
        {
          id: "a",
          label: "Draft A",
        },
        {
          id: "b",
          label: "Draft B",
        },
        {
          id: "c",
          label: "Draft C",
        },
        {
          id: "d",
          label: "Draft D",
        },
      ],
      incomingItem: {
        id: "urgent",
        label: "Time-sensitive",
      },
      insertBeforeId: "b",
      priorityLabel: "Move ahead of Draft B",
      serviceLabel: "Next to start",
      showOriginalPositions: true,
    },
  },
];
