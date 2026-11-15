import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./TeacherLearningCover.schema";
/** Fictional complete examples and deliberately invalid author inputs. */
export const DEFAULT_INPUT: Input = {
  staff: {
    teacher: {
      id: "teacher",
      label: "Teacher A",
    },
    cover: {
      id: "cover",
      label: "Colleague B",
    },
    mentor: {
      id: "mentor",
      label: "Mentor C",
    },
  },
  learners: [
    {
      id: "a",
      label: "Learner A",
    },
    {
      id: "b",
      label: "Learner B",
    },
    {
      id: "c",
      label: "Learner C",
    },
    {
      id: "d",
      label: "Learner D",
    },
  ],
  session: {
    label: "Practice together",
    mode: "rehearsal",
    prompt: "Ask an open question",
  },
  roomLabels: {
    classroom: "Example class",
    supportSpace: "Mentor alcove",
  },
  phaseLabels: {
    cover: "Cover arrives",
    support: "Teacher practices",
    return: "Teacher returns",
  },
  showClassroomResponsibility: true,
  caption: "Fictional staffing arrangement",
};
/** Six learners remain attended during the alternate planning gesture. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  session: { ...DEFAULT_INPUT.session, mode: "co-planning" },
  showClassroomResponsibility: false,
  learners: Array.from({ length: 6 }, (_, index) => ({
    id: `learner ${index}`,
    label: `Learner ${index}`,
  })),
};
/** Schema rejection examples. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, learners: [] },
  {
    ...DEFAULT_INPUT,
    staff: { ...DEFAULT_INPUT.staff, cover: DEFAULT_INPUT.staff.teacher },
  },
  {
    ...DEFAULT_INPUT,
    learners: [DEFAULT_INPUT.learners[0], DEFAULT_INPUT.learners[0]],
  },
  { ...DEFAULT_INPUT, session: { ...DEFAULT_INPUT.session, mode: "grading" } },
  {
    ...DEFAULT_INPUT,
    session: { ...DEFAULT_INPUT.session, prompt: "x".repeat(41) },
  },
];
/** Minimum class and hidden optional responsibility bracket. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  learners: DEFAULT_INPUT.learners.slice(0, 2),
  showClassroomResponsibility: false,
};
/** Six fixed learners and the full accepted text capacities. */
export const denseInput: Input = {
  ...changedInput,
  staff: {
    teacher: { id: "教 師", label: "界".repeat(20) },
    cover: { id: "cover", label: "界".repeat(20) },
    mentor: { id: "mentor", label: "界".repeat(20) },
  },
  learners: changedInput.learners.map((learner) => ({
    ...learner,
    label: "界".repeat(16),
  })),
  session: {
    label: "界".repeat(24),
    mode: "rehearsal",
    prompt: "界".repeat(40),
  },
  roomLabels: { classroom: "界".repeat(24), supportSpace: "界".repeat(24) },
  phaseLabels: {
    cover: "界".repeat(24),
    support: "界".repeat(24),
    return: "界".repeat(24),
  },
  showClassroomResponsibility: true,
  caption: "界".repeat(48),
};
/** Complete examples for both session modes and responsibility variants. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
];
