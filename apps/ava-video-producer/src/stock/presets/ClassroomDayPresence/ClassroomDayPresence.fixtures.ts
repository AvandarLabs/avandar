import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ClassroomDayPresence.schema";
/** Complete fictional inputs for the bounded stock animation. */
export const DEFAULT_INPUT: Input = {
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
    {
      id: "e",
      label: "Learner E",
    },
    {
      id: "f",
      label: "Learner F",
    },
  ],
  days: [
    {
      id: "day-a",
      label: "Day A",
      records: [
        {
          learnerId: "a",
          state: "present",
        },
        {
          learnerId: "b",
          state: "present",
        },
        {
          learnerId: "c",
          state: "absent",
        },
        {
          learnerId: "d",
          state: "present",
        },
        {
          learnerId: "e",
          state: "absent",
        },
        {
          learnerId: "f",
          state: "present",
        },
      ],
    },
    {
      id: "day-b",
      label: "Day B",
      records: [
        {
          learnerId: "a",
          state: "present",
        },
        {
          learnerId: "b",
          state: "present",
        },
        {
          learnerId: "c",
          state: "present",
        },
        {
          learnerId: "d",
          state: "present",
        },
        {
          learnerId: "e",
          state: "present",
        },
        {
          learnerId: "f",
          state: "absent",
        },
      ],
    },
    {
      id: "day-c",
      label: "Day C",
      records: [
        {
          learnerId: "a",
          state: "present",
        },
        {
          learnerId: "b",
          state: "absent",
        },
        {
          learnerId: "c",
          state: "present",
        },
        {
          learnerId: "d",
          state: "unknown",
        },
        {
          learnerId: "e",
          state: "present",
        },
        {
          learnerId: "f",
          state: "present",
        },
      ],
    },
  ],
  labels: {
    present: "Present",
    absent: "Absent",
    unknown: "Unknown",
    roster: "On roster",
  },
  deskLayout: "two-rows",
  showDayImpressions: true,
  caption: "Fictional classroom roster",
};
/** Invalid authored documents are rejected instead of silently repaired. */
export const invalidInputs: unknown[] = [{}, { ...DEFAULT_INPUT, extra: true }];
/** Changed input independently exercises the central semantic invariant. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  days: DEFAULT_INPUT.days.map((day) => ({
    ...day,
    records: day.records.map((record) => ({ ...record, state: "unknown" })),
  })),
};
invalidInputs.push(
  {
    ...DEFAULT_INPUT,
    days: DEFAULT_INPUT.days.map((day) => ({
      ...day,
      records: day.records.slice(1),
    })),
  },
  {
    ...DEFAULT_INPUT,
    days: DEFAULT_INPUT.days.map((day) => ({
      ...day,
      records: day.records.map((record) => ({ ...record, learnerId: "a" })),
    })),
  },
);
const minimum: Input = {
  ...DEFAULT_INPUT,
  learners: DEFAULT_INPUT.learners.slice(0, 3),
  days: DEFAULT_INPUT.days
    .slice(0, 2)
    .map((day) => ({ ...day, records: day.records.slice(0, 3) })),
  deskLayout: "horseshoe",
  showDayImpressions: false,
};
const denseLearners: Array<{ id: string; label: string }> = Array.from(
  { length: 8 },
  (_, index) => ({
    id: `learner ${index} 空`,
    label: "界".repeat(16),
  }),
);
const dense: Input = {
  ...DEFAULT_INPUT,
  learners: denseLearners,
  days: Array.from({ length: 3 }, (_, dayIndex) => ({
    id: `day ${dayIndex}`,
    label: "界".repeat(16),
    records: denseLearners.map((learner, index) => ({
      learnerId: learner.id,
      state:
        dayIndex === 1
          ? ("unknown" as const)
          : index % 3 === 0
            ? ("absent" as const)
            : index % 3 === 1
              ? ("present" as const)
              : ("unknown" as const),
    })),
  })),
  labels: {
    present: "界".repeat(18),
    absent: "界".repeat(18),
    unknown: "界".repeat(18),
    roster: "界".repeat(18),
  },
  caption: "界".repeat(48),
};
/** Full rooms exercise every day and both persistent desk arrangements. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changedInput },
  {
    id: "horseshoe-dense",
    input: { ...dense, deskLayout: "horseshoe" as const },
  },
  { id: "hidden-impressions", input: { ...dense, showDayImpressions: false } },
];
invalidInputs.push(
  {
    ...DEFAULT_INPUT,
    learners: DEFAULT_INPUT.learners.map((learner) => ({
      ...learner,
      id: "same",
    })),
  },
  {
    ...DEFAULT_INPUT,
    days: DEFAULT_INPUT.days.map((day) => ({ ...day, id: "same" })),
  },
);
