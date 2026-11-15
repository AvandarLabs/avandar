import type { DecisionForkInput } from "./DecisionFork.schema";

/** Complete fictional example for the one-junction decision illustration. */
export const DECISION_FORK_DEFAULT_INPUT: DecisionForkInput = {
  prompt: "Where does the fictional sketch belong?",
  branches: [
    { id: "rough", condition: "Still exploring", outcome: "Idea notebook" },
    { id: "ready", condition: "Ready to share", outcome: "Review folder" },
    { id: "archive", condition: "No longer active", outcome: "Archive" },
  ],
  selectedBranchId: "ready",
  scenarioLabel: "A sketch ready for feedback",
  selectionLabel: "Chosen for this example",
  showUnchosenOutcomes: true,
};

/** Four-branch example exercises the largest supported authored layout. */
export const DECISION_FORK_DENSE_INPUT: DecisionForkInput = {
  prompt: "Which authored route fits this fictional request?",
  branches: [
    {
      id: "continue",
      condition: "Ready for review",
      outcome: "Continue to review",
    },
    {
      id: "revise",
      condition: "Needs another draft",
      outcome: "Return to the notebook",
    },
    {
      id: "pause",
      condition: "Waiting for feedback",
      outcome: "Hold for a response",
    },
    {
      id: "archive",
      condition: "No longer in progress",
      outcome: "Keep in the archive",
    },
  ],
  selectedBranchId: "revise",
  scenarioLabel: "An explicitly authored scenario",
  selectionLabel: "Chosen for this fictional sketch",
  showUnchosenOutcomes: true,
};

/** Named snapshots available for content and visual boundary inspection. */
export const decisionForkFixtures: Array<{
  id: string;
  input: DecisionForkInput;
}> = [
  { id: "default", input: DECISION_FORK_DEFAULT_INPUT },
  { id: "dense", input: DECISION_FORK_DENSE_INPUT },
];

/**
 * Standard complete default export preserves the established public fixture.
 */
export const defaultInput: typeof DECISION_FORK_DEFAULT_INPUT =
  DECISION_FORK_DEFAULT_INPUT;
/**
 * Complete minimum, maximum text and changed-choice fixtures for packet review.
 */
export const fixtures: Array<{ id: string; input: DecisionForkInput }> = [
  { id: "default", input: defaultInput },
  {
    id: "minimum",
    input: {
      prompt: "Q",
      branches: [
        { id: "a", condition: "A", outcome: "B" },
        { id: "b", condition: "C", outcome: "D" },
      ],
      selectedBranchId: "a",
      scenarioLabel: "S",
      selectionLabel: "",
      showUnchosenOutcomes: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DECISION_FORK_DENSE_INPUT,
      prompt: "界".repeat(52),
      branches: DECISION_FORK_DENSE_INPUT.branches.map((branch) => ({
        ...branch,
        condition: "界".repeat(24),
        outcome: "界".repeat(24),
      })),
      scenarioLabel: "界".repeat(32),
      selectionLabel: "界".repeat(32),
    },
  },
  {
    id: "changed",
    input: {
      ...DECISION_FORK_DEFAULT_INPUT,
      selectedBranchId: "archive",
      showUnchosenOutcomes: false,
    },
  },
];
/** Strict documents reject duplicate branches and foreign selections. */
export const invalidInputs: unknown[] = [
  { ...defaultInput, extra: true },
  { ...defaultInput, selectedBranchId: "missing" },
  {
    ...defaultInput,
    branches: [defaultInput.branches[0], defaultInput.branches[0]],
  },
  {
    ...defaultInput,
    branches: [
      { ...defaultInput.branches[0], extra: true },
      defaultInput.branches[1],
    ],
  },
];
