import type { Input } from "./DoseCohortReturnPaths.schema";
/** Complete fictional default, replaced only as a whole input. */
export const DEFAULT_INPUT: Input = {
  visits: [
    { id: "v1", label: "Visit A" },
    { id: "v2", label: "Visit B" },
    { id: "v3", label: "Visit C" },
  ],
  participants: [
    {
      id: "a",
      label: "Person A",
      records: [
        { visitId: "v1", state: "recorded" },
        { visitId: "v2", state: "recorded" },
        { visitId: "v3", state: "recorded" },
      ],
    },
    {
      id: "b",
      label: "Person B",
      records: [
        { visitId: "v1", state: "recorded" },
        { visitId: "v2", state: "recorded" },
        { visitId: "v3", state: "missed" },
      ],
    },
    {
      id: "c",
      label: "Person C",
      records: [
        { visitId: "v1", state: "recorded" },
        { visitId: "v2", state: "missed" },
        { visitId: "v3", state: "recorded" },
      ],
    },
    {
      id: "d",
      label: "Person D",
      records: [
        { visitId: "v1", state: "recorded" },
        { visitId: "v2", state: "unknown" },
        { visitId: "v3", state: "unknown" },
      ],
    },
    {
      id: "e",
      label: "Person E",
      records: [
        { visitId: "v1", state: "recorded" },
        { visitId: "v2", state: "recorded" },
        { visitId: "v3", state: "not-due" },
      ],
    },
    {
      id: "f",
      label: "Person F",
      records: [
        { visitId: "v1", state: "recorded" },
        { visitId: "v2", state: "missed" },
        { visitId: "v3", state: "missed" },
      ],
    },
  ],
  sceneLabel: "Fictional example",
  emphasis: "missed-and-returned",
  showFractions: true,
  copy: {
    baseline: "Baseline cohort",
    recorded: "Visit recorded",
    missed: "Visit missed",
    notDue: "Not yet due",
    unknown: "Record unknown",
    retained: "Recorded / baseline",
  },
};
const minimum: Input = {
  ...DEFAULT_INPUT,
  visits: [
    { id: "", label: "" },
    { id: "v2", label: "" },
  ],
  participants: ["", "界 space"].map((id) => ({
    id,
    label: "",
    records: [
      { visitId: "", state: "unknown" },
      { visitId: "v2", state: "not-due" },
    ],
  })),
};
const STATES: readonly ["recorded", "missed", "not-due", "unknown"] = [
  "recorded",
  "missed",
  "not-due",
  "unknown",
] as const;
const dense: Input = {
  ...DEFAULT_INPUT,
  visits: Array.from({ length: 4 }, (_, index) => ({
    id: `v${index}`,
    label: "界".repeat(18),
  })),
  participants: Array.from({ length: 8 }, (_, index) => ({
    id: `p${index}`,
    label: "界".repeat(18),
    records: Array.from({ length: 4 }, (unusedVisit, visitIndex) => ({
      visitId: `v${visitIndex}`,
      state: STATES[(index + visitIndex) % 4],
    })),
  })),
  sceneLabel: "界".repeat(40),
  copy: Object.fromEntries(
    Object.keys(DEFAULT_INPUT.copy).map((key) => [key, "界".repeat(42)]),
  ) as Input["copy"],
};
const changed: Input = {
  ...DEFAULT_INPUT,
  participants: DEFAULT_INPUT.participants.map((person, index) => ({
    ...person,
    records: person.records.map((record, visitIndex) =>
      visitIndex === 0 && index < 3
        ? { ...record, state: STATES[index + 1] }
        : record,
    ),
  })),
};
const toggles: Input = {
  ...changed,
  emphasis: "unknown-records",
  showFractions: false,
};
/** Invalid shape, identity and semantic relationship samples. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, visits: [] },
  {
    ...DEFAULT_INPUT,
    visits: [DEFAULT_INPUT.visits[0], DEFAULT_INPUT.visits[0]],
  },
  {
    ...DEFAULT_INPUT,
    participants: DEFAULT_INPUT.participants.map((person, index) =>
      index
        ? person
        : {
            ...person,
            records: person.records.map((record, visitIndex) =>
              visitIndex ? record : { ...record, visitId: "absent" },
            ),
          },
    ),
  },
];
/** Accepted minimum, dense, changed and disabled-display examples. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
  { id: "toggles", input: toggles },
];
