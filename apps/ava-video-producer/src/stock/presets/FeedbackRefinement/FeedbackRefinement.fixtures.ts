import type { Input } from "./FeedbackRefinement.schema";
/** Complete fictional default exchange. */
export const DEFAULT_INPUT: Input = {
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
};
const dense: Input = {
  ...DEFAULT_INPUT,
  artifactLabel: "W".repeat(24),
  roleLabels: { author: "W".repeat(20), reviewer: "W".repeat(20) },
  finalLabel: "W".repeat(26),
  showRoundLabels: true,
  rounds: [
    {
      label: "W".repeat(12),
      draft: "A".repeat(26),
      feedback: "W".repeat(28),
      revised: "B".repeat(26),
    },
    {
      label: "V".repeat(12),
      draft: "B".repeat(26),
      feedback: "V".repeat(28),
      revised: "C".repeat(26),
    },
  ],
};
/** Default, minimum, dense and changed authored exchanges. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      artifactLabel: "A",
      rounds: [{ label: "P", draft: "A", feedback: "B", revised: "C" }],
      roleLabels: { author: "A", reviewer: "B" },
      finalLabel: "C",
      showReviewTrail: false,
      showRoundLabels: false,
    },
  },
  { id: "dense", input: dense },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      rounds: [
        {
          label: "First",
          draft: "Open the form",
          feedback: "Include a due date",
          revised: "Open the form by Friday",
        },
      ],
      showReviewTrail: false,
      showRoundLabels: true,
      finalLabel: "Return for another review",
    },
  },
];
/** Rejections cover incomplete documents, bounds and revision continuity. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, rounds: [] },
  { ...DEFAULT_INPUT, rounds: [...dense.rounds, dense.rounds[0]] },
  { ...DEFAULT_INPUT, artifactLabel: "" },
  {
    ...DEFAULT_INPUT,
    rounds: [
      { ...DEFAULT_INPUT.rounds[0], revised: DEFAULT_INPUT.rounds[0].draft },
    ],
  },
  {
    ...dense,
    rounds: [dense.rounds[0], { ...dense.rounds[1], draft: "Different" }],
  },
  { ...DEFAULT_INPUT, roleLabels: { ...DEFAULT_INPUT.roleLabels, extra: "x" } },
  {
    ...DEFAULT_INPUT,
    rounds: [{ ...DEFAULT_INPUT.rounds[0], feedback: "x".repeat(29) }],
  },
];
