import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./FeedbackRefinement.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
import type { Input } from "./FeedbackRefinement.schema";

export { controls } from "./FeedbackRefinement.controls";
/** Public retrieval copy excludes private planning provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored display-copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["artifactLabel"],
  ["rounds", 0, "label"],
  ["rounds", 0, "draft"],
  ["rounds", 0, "feedback"],
  ["rounds", 0, "revised"],
  ["roleLabels", "author"],
  ["roleLabels", "reviewer"],
  ["finalLabel"],
];
/** Complete fictional source binding. */
export const BINDING_EXAMPLES: Array<{
  sourceText: { id: string; message: string };
  input: Input;
}> = [
  {
    sourceText: {
      id: "motionAtlas.feedback-refinement.bindingExamples.0.sourceText",
      message:
        "In a fictional writing review, the note to name the next step changes Share update to Review the draft before the message is ready to share.",
    },
    input: {
      artifactLabel: "Sample message",
      rounds: [
        {
          label: "Pass A",
          draft: "Share update",
          feedback: "Name the next step",
          revised: "Review the draft",
        },
      ],
      roleLabels: {
        author: "Writer",
        reviewer: "Reviewer",
      },
      finalLabel: "Ready to share",
      showReviewTrail: true,
      showRoundLabels: false,
    },
  },
];
