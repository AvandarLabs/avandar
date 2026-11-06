import { z } from "zod";
import { inputSchema } from "./FeedbackRefinement.schema";
import type { StockControl } from "../../contracts/StockContract.types";

function _copy({ path, message }: { path: string; message: string }) {
  return { id: `motionAtlas.feedback-refinement.controls.${path}`, message };
}
/** Serializable recursive controls preserve the accepted authored bounds. */
export const controls: StockControl[] = [
  {
    path: "artifactLabel",
    label: _copy({ path: "artifactLabel", message: "Artifact label" }),
    kind: "text",
    minLength: 1,
    maxLength: 24,
  },
  {
    path: "rounds",
    label: _copy({ path: "rounds", message: "Rounds" }),
    kind: "collection",
    minItems: 1,
    maxItems: 2,
    itemSchema: z.toJSONSchema(inputSchema.shape.rounds.element),
    itemControls: [
      {
        path: "label",
        label: _copy({ path: "rounds.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 12,
      },
      {
        path: "draft",
        label: _copy({ path: "rounds.draft", message: "Draft" }),
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "feedback",
        label: _copy({ path: "rounds.feedback", message: "Feedback" }),
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "revised",
        label: _copy({ path: "rounds.revised", message: "Revised" }),
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
    ],
  },
  {
    path: "roleLabels",
    label: _copy({ path: "roleLabels", message: "Role labels" }),
    kind: "object",
    controls: [
      {
        path: "author",
        label: _copy({ path: "roleLabels.author", message: "Author" }),
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "reviewer",
        label: _copy({ path: "roleLabels.reviewer", message: "Reviewer" }),
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
    ],
  },
  {
    path: "finalLabel",
    label: _copy({ path: "finalLabel", message: "Final label" }),
    kind: "text",
    minLength: 1,
    maxLength: 26,
  },
  {
    path: "showReviewTrail",
    label: _copy({ path: "showReviewTrail", message: "Show review trail" }),
    kind: "boolean",
  },
  {
    path: "showRoundLabels",
    label: _copy({ path: "showRoundLabels", message: "Show round labels" }),
    kind: "boolean",
  },
];
