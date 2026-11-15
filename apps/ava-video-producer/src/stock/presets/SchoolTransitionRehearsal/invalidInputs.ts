import { DEFAULT_INPUT } from "./defaultInput";
/** Rejected structural, boundary and cross-field inputs. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "people"),
  ),
  { ...DEFAULT_INPUT, people: { ...DEFAULT_INPUT.people, extra: true } },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "stops"),
  ),
  {
    ...DEFAULT_INPUT,
    stops: [
      {
        id: "locker",
        kind: "locker",
        label: "Demo locker",
        actionLabel: "Try the locker",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    stops: [
      {
        id: "locker",
        kind: "locker",
        label: "Demo locker",
        actionLabel: "Try the locker",
      },
      {
        id: "locker",
        kind: "locker",
        label: "Demo locker",
        actionLabel: "Try the locker",
      },
      {
        id: "locker",
        kind: "locker",
        label: "Demo locker",
        actionLabel: "Try the locker",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    stops: [{ ...DEFAULT_INPUT.stops[0], extra: true }, DEFAULT_INPUT.stops[1]],
  },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(
      ([field]) => field !== "finalStepSupport",
    ),
  ),
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(
      ([field]) => field !== "showPracticeStrip",
    ),
  ),
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "labels"),
  ),
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(
      ([field]) => field !== "showFootprints",
    ),
  ),
  {
    ...DEFAULT_INPUT,
    people: { ...DEFAULT_INPUT.people, learner: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  {
    ...DEFAULT_INPUT,
    people: {
      ...DEFAULT_INPUT.people,
      companion: "WWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    stops: [
      { ...DEFAULT_INPUT.stops[0], id: "WWWWWWWWWWWWWWWWW" },
      DEFAULT_INPUT.stops[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    stops: [
      { ...DEFAULT_INPUT.stops[0], kind: "invalid" },
      DEFAULT_INPUT.stops[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    stops: [
      { ...DEFAULT_INPUT.stops[0], label: "WWWWWWWWWWWWWWWWWWWWWWWWW" },
      DEFAULT_INPUT.stops[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    stops: [
      {
        ...DEFAULT_INPUT.stops[0],
        actionLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.stops[1],
    ],
  },
  { ...DEFAULT_INPUT, finalStepSupport: "invalid" },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      setting: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      practice: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      choice: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    stops: [
      DEFAULT_INPUT.stops[0],
      { ...DEFAULT_INPUT.stops[1], id: "locker" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    stops: [
      { ...DEFAULT_INPUT.stops[0], kind: "classroom" },
      DEFAULT_INPUT.stops[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    stops: [
      DEFAULT_INPUT.stops[0],
      { ...DEFAULT_INPUT.stops[1], kind: "locker" },
    ],
  },
];
