import { propNotEq } from "@avandar/utils";
import type { Input } from "./VaccinationSessionBalance.schema";
/** Complete fictional default, replaced only as a whole input. */
export const DEFAULT_INPUT: Input = {
  units: [
    { id: "u1", outcome: "administered", recipientId: "p1" },
    { id: "u2", outcome: "administered", recipientId: "p2" },
    { id: "u3", outcome: "administered", recipientId: "p3" },
    { id: "u4", outcome: "remaining", recipientId: null },
    { id: "u5", outcome: "remaining", recipientId: null },
    { id: "u6", outcome: "discarded", recipientId: null },
  ],
  recipients: [
    { id: "p1", label: "Person A" },
    { id: "p2", label: "Person B" },
    { id: "p3", label: "Person C" },
  ],
  sceneLabel: "Fictional example",
  showPeopleTotal: true,
  showEquation: true,
  copy: {
    opening: "Opening dose units",
    administered: "Recorded as used",
    remaining: "Remaining stock",
    discarded: "Recorded loss",
    people: "People served",
    unit: "dose units",
  },
};
const minimum: Input = {
  ...DEFAULT_INPUT,
  units: [{ id: "", outcome: "remaining", recipientId: null }],
  recipients: [],
};
const dense: Input = {
  ...DEFAULT_INPUT,
  units: Array.from({ length: 12 }, (_, index) => ({
    id: `u${index}`,
    outcome: "administered",
    recipientId: `p${index % 6}`,
  })),
  recipients: Array.from({ length: 6 }, (_, index) => ({
    id: `p${index}`,
    label: "界".repeat(18),
  })),
  sceneLabel: "界".repeat(40),
  copy: Object.fromEntries(
    Object.keys(DEFAULT_INPUT.copy).map((key) => [key, "界".repeat(42)]),
  ) as Input["copy"],
};
const changed: Input = {
  ...DEFAULT_INPUT,
  units: DEFAULT_INPUT.units.map((unit, index) =>
    index === 1 ? { ...unit, recipientId: "p1" } : unit,
  ),
  recipients: DEFAULT_INPUT.recipients.filter(propNotEq("id", "p2")),
};
const toggles: Input = {
  ...changed,
  showPeopleTotal: false,
  showEquation: false,
};
/** Invalid shape, identity and semantic relationship samples. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, units: [] },
  { ...DEFAULT_INPUT, units: [DEFAULT_INPUT.units[0], DEFAULT_INPUT.units[0]] },
  ...[
    { outcome: "administered", recipientId: null },
    { outcome: "administered", recipientId: "" },
    { outcome: "remaining", recipientId: "p1" },
  ].map((unit) => ({ ...DEFAULT_INPUT, units: [{ id: "u", ...unit }] })),
  { ...DEFAULT_INPUT, recipients: DEFAULT_INPUT.recipients.slice(0, 1) },
];
/** Accepted minimum, dense, changed and disabled-display examples. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
  { id: "toggles", input: toggles },
];
