import type { Input } from "./MissedVisitReconnect.schema";
/** Complete fictional default, replaced only as a whole input. */
export const DEFAULT_INPUT: Input = {
  cases: [
    {
      id: "a",
      label: "Person A",
      channel: "phone",
      attempts: 1,
      outcome: "attended",
    },
    {
      id: "b",
      label: "Person B",
      channel: "doorstep",
      attempts: 2,
      outcome: "booked",
    },
    {
      id: "c",
      label: "Person C",
      channel: "phone",
      attempts: 1,
      outcome: "contacted",
    },
    {
      id: "d",
      label: "Person D",
      channel: "doorstep",
      attempts: 2,
      outcome: "unreached",
    },
  ],
  places: {
    homeLabel: "Example homes",
    clinicLabel: "Hill clinic",
    calendarLabel: "Return booking",
  },
  sceneLabel: "Fictional example",
  showAttemptCount: true,
  showOutcomeLedger: true,
  copy: {
    group: "People with a missed visit",
    attempts: "Contact attempts",
    unreached: "Not reached",
    contacted: "Contacted",
    booked: "Return booked",
    attended: "Return recorded",
  },
};
const minimum: Input = {
  ...DEFAULT_INPUT,
  cases: [
    { ...DEFAULT_INPUT.cases[0], id: "", label: "", outcome: "unreached" },
  ],
};
const dense: Input = {
  ...DEFAULT_INPUT,
  cases: Array.from({ length: 6 }, (_, index) => ({
    ...DEFAULT_INPUT.cases[index % 4],
    id: `case ${index}界`,
    label: "界".repeat(18),
    attempts: 3,
  })),
  places: {
    homeLabel: "界".repeat(24),
    clinicLabel: "界".repeat(24),
    calendarLabel: "界".repeat(24),
  },
  sceneLabel: "界".repeat(40),
  copy: Object.fromEntries(
    Object.keys(DEFAULT_INPUT.copy).map((key) => [key, "界".repeat(42)]),
  ) as Input["copy"],
};
const OUTCOMES: readonly ["booked", "attended", "unreached", "contacted"] = [
  "booked",
  "attended",
  "unreached",
  "contacted",
] as const;
const changed: Input = {
  ...DEFAULT_INPUT,
  cases: DEFAULT_INPUT.cases.map((item, index) => ({
    ...item,
    outcome: OUTCOMES[index],
  })),
};
const toggles: Input = {
  ...changed,
  showAttemptCount: false,
  showOutcomeLedger: false,
};
/** Invalid shape, identity and semantic relationship samples. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, cases: [] },
  { ...DEFAULT_INPUT, cases: [DEFAULT_INPUT.cases[0], DEFAULT_INPUT.cases[0]] },
  { ...DEFAULT_INPUT, cases: [{ ...DEFAULT_INPUT.cases[0], attempts: 0 }] },
];
/** Accepted minimum, dense, changed and disabled-display examples. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
  { id: "toggles", input: toggles },
];
