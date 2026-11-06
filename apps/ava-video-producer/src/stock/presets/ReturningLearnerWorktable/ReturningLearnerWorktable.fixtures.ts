import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ReturningLearnerWorktable.schema";
/** Fictional complete examples and deliberately invalid author inputs. */
export const DEFAULT_INPUT: Input = {
  people: {
    learner: "Learner A",
    teacher: "Teacher A",
  },
  periodLabels: {
    before: "Earlier lessons",
    interruption: "Time away",
    return: "Return session",
  },
  priorWork: [
    {
      id: "drawing",
      label: "Shape drawing",
      form: "drawing",
    },
    {
      id: "numbers",
      label: "Number practice",
      form: "number-work",
    },
  ],
  returnActivities: [
    {
      id: "review",
      label: "Revisit shapes",
      kind: "review",
      priorWorkId: "drawing",
    },
    {
      id: "new",
      label: "Try a new pattern",
      kind: "new",
      priorWorkId: "",
    },
  ],
  activityLabels: {
    retained: "Earlier work",
    review: "Review together",
    new: "New activity",
  },
  showPortfolioTrail: true,
  caption: "Fictional return session",
};
/** Repeated reviews point at one retained artifact without replacing it. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  showPortfolioTrail: false,
  returnActivities: [
    { id: "r1", label: "Review once", kind: "review", priorWorkId: "drawing" },
    { id: "r2", label: "Review again", kind: "review", priorWorkId: "drawing" },
    { id: "n1", label: "New work", kind: "new", priorWorkId: "" },
  ],
};
/** Schema rejection examples. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, priorWork: [] },
  {
    ...DEFAULT_INPUT,
    priorWork: [DEFAULT_INPUT.priorWork[0], DEFAULT_INPUT.priorWork[0]],
  },
  {
    ...DEFAULT_INPUT,
    returnActivities: [
      { ...DEFAULT_INPUT.returnActivities[0], priorWorkId: "unknown" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    returnActivities: [
      { ...DEFAULT_INPUT.returnActivities[1], priorWorkId: "drawing" },
    ],
  },
  { ...DEFAULT_INPUT, returnActivities: [] },
];
/** Smallest accepted portfolio and activity, with a Unicode identity. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  priorWork: [{ id: "作品 space", label: "W", form: "writing" }],
  returnActivities: [{ id: "new", label: "N", kind: "new", priorWorkId: "" }],
  showPortfolioTrail: false,
};
/** Maximum artifact/activity collections and every accepted text capacity. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  people: { learner: "界".repeat(20), teacher: "界".repeat(20) },
  periodLabels: {
    before: "界".repeat(24),
    interruption: "界".repeat(24),
    return: "界".repeat(24),
  },
  priorWork: (["drawing", "writing", "number-work"] as const).map(
    (form, index) => ({ id: `work ${index}`, label: "界".repeat(24), form }),
  ),
  returnActivities: [
    {
      id: "review 1",
      label: "界".repeat(28),
      kind: "review",
      priorWorkId: "work 0",
    },
    {
      id: "review 2",
      label: "界".repeat(28),
      kind: "review",
      priorWorkId: "work 0",
    },
    { id: "new", label: "界".repeat(28), kind: "new", priorWorkId: "" },
  ],
  activityLabels: {
    retained: "界".repeat(24),
    review: "界".repeat(24),
    new: "界".repeat(24),
  },
  caption: "界".repeat(48),
};
/** Several new activities deliberately have no prior artifact reference. */
export const newActivitiesInput: Input = {
  ...DEFAULT_INPUT,
  returnActivities: [
    { id: "n1", label: "New drawing", kind: "new", priorWorkId: "" },
    { id: "n2", label: "New writing", kind: "new", priorWorkId: "" },
    { id: "n3", label: "New numbers", kind: "new", priorWorkId: "" },
  ],
};
/** Complete accepted examples, including repeated reviews and new-only work. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "new-activities", input: newActivitiesInput },
];
