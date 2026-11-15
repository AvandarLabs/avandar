import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./PersonLedSupportCalendar.schema";
/** Complete fictional default, exactly as authored. */
export const DEFAULT_INPUT: Input = {
  people: {
    participant: "Demo participant",
    worker: "Demo caseworker",
  },
  days: [
    {
      id: "a",
      label: "Demo Tuesday",
    },
    {
      id: "b",
      label: "Demo Wednesday",
    },
  ],
  timeBands: [
    {
      id: "morning",
      label: "Morning",
    },
    {
      id: "afternoon",
      label: "Afternoon",
    },
  ],
  commitments: [
    {
      id: "care",
      label: "Caregiving",
      kind: "existing",
      initialDayId: "a",
      initialBandId: "morning",
      agreedDayId: "a",
      agreedBandId: "morning",
    },
    {
      id: "visit",
      label: "Planning visit",
      kind: "support",
      initialDayId: "a",
      initialBandId: "morning",
      agreedDayId: "b",
      agreedBandId: "morning",
    },
  ],
  copy: {
    goal: "Keep caregiving time",
    agreement: "Time agreed",
    example: "Fictional planning example",
  },
  showOriginalAppointment: true,
};
/** Minimum collections including valid empty identifiers. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  days: [{ ...DEFAULT_INPUT["days"][0], id: "" }, DEFAULT_INPUT["days"][1]],
  timeBands: [
    { ...DEFAULT_INPUT["timeBands"][0], id: "" },
    DEFAULT_INPUT["timeBands"][1],
  ],
  commitments: [
    {
      ...DEFAULT_INPUT["commitments"][0],
      id: "",
      label: "",
      initialDayId: "",
      initialBandId: "",
      agreedDayId: "",
      agreedBandId: "",
    },
    {
      ...DEFAULT_INPUT["commitments"][1],
      label: "",
      initialDayId: "",
      initialBandId: "",
      agreedBandId: "",
    },
  ],
};
/** Maximum collections and accepted text bounds. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  people: {
    ...DEFAULT_INPUT["people"],
    participant: "WWWWWWWWWWWWWWWWWWWWWWWW",
    worker: "WWWWWWWWWWWWWWWWWWWWWWWW",
  },
  days: [
    { ...DEFAULT_INPUT["days"][0], id: "0", label: "WWWWWWWWWWWWWWWWWWWW" },
    { ...DEFAULT_INPUT["days"][1], id: "1", label: "WWWWWWWWWWWWWWWWWWWW" },
    { id: "2", label: "WWWWWWWWWWWWWWWWWWWW" },
    { id: "3", label: "WWWWWWWWWWWWWWWWWWWW" },
  ],
  timeBands: [
    { ...DEFAULT_INPUT["timeBands"][0], id: "0", label: "WWWWWWWWWWWWWWWW" },
    { ...DEFAULT_INPUT["timeBands"][1], id: "1", label: "WWWWWWWWWWWWWWWW" },
    { id: "2", label: "WWWWWWWWWWWWWWWW" },
  ],
  commitments: [
    {
      ...DEFAULT_INPUT["commitments"][0],
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWW",
      initialDayId: "0",
      initialBandId: "0",
      agreedDayId: "0",
      agreedBandId: "0",
    },
    {
      ...DEFAULT_INPUT["commitments"][1],
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWW",
      kind: "existing",
      initialDayId: "1",
      initialBandId: "0",
      agreedDayId: "1",
      agreedBandId: "0",
    },
    {
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWWWW",
      kind: "existing",
      initialDayId: "2",
      initialBandId: "0",
      agreedDayId: "2",
      agreedBandId: "0",
    },
    {
      id: "3",
      label: "WWWWWWWWWWWWWWWWWWWWWW",
      kind: "existing",
      initialDayId: "3",
      initialBandId: "0",
      agreedDayId: "3",
      agreedBandId: "0",
    },
    {
      id: "4",
      label: "WWWWWWWWWWWWWWWWWWWWWW",
      kind: "support",
      initialDayId: "0",
      initialBandId: "0",
      agreedDayId: "0",
      agreedBandId: "2",
    },
  ],
  copy: {
    ...DEFAULT_INPUT["copy"],
    goal: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    agreement: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
};
/** Changed authored quantities or optional presentation. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  commitments: [
    DEFAULT_INPUT["commitments"][0],
    { ...DEFAULT_INPUT["commitments"][1], agreedBandId: "afternoon" },
  ],
  showOriginalAppointment: false,
};
/** Spaces and Unicode remain valid authored identifiers and references. */
const unicodeInput: Input = {
  ...DEFAULT_INPUT,
  days: [
    { ...DEFAULT_INPUT["days"][0], id: " α a" },
    { ...DEFAULT_INPUT["days"][1], id: " α b" },
  ],
  timeBands: [
    { ...DEFAULT_INPUT["timeBands"][0], id: " α morning" },
    { ...DEFAULT_INPUT["timeBands"][1], id: " α afternoon" },
  ],
  commitments: [
    {
      ...DEFAULT_INPUT["commitments"][0],
      id: " α care",
      initialDayId: " α a",
      initialBandId: " α morning",
      agreedDayId: " α a",
      agreedBandId: " α morning",
    },
    {
      ...DEFAULT_INPUT["commitments"][1],
      id: " α visit",
      initialDayId: " α a",
      initialBandId: " α morning",
      agreedDayId: " α b",
      agreedBandId: " α morning",
    },
  ],
};
/** Incomplete documents, extra keys and invalid semantic relationships. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  {
    ...DEFAULT_INPUT,
    commitments: [
      DEFAULT_INPUT["commitments"][0],
      { ...DEFAULT_INPUT["commitments"][1], agreedDayId: "a" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    commitments: [
      { ...DEFAULT_INPUT["commitments"][0], agreedDayId: "b" },
      DEFAULT_INPUT["commitments"][1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    commitments: [
      DEFAULT_INPUT["commitments"][0],
      { ...DEFAULT_INPUT["commitments"][1], initialDayId: "missing" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    commitments: [
      DEFAULT_INPUT["commitments"][0],
      { ...DEFAULT_INPUT["commitments"][1], initialDayId: "b" },
    ],
  },
];
/** Deterministic collection, text, quantity and identity cases. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "unicode", input: unicodeInput },
];
