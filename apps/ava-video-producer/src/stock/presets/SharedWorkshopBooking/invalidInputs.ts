import { DEFAULT_INPUT } from "./defaultInput";
/** Rejected structural, boundary and cross-field inputs. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "machine"),
  ),
  { ...DEFAULT_INPUT, machine: { ...DEFAULT_INPUT.machine, extra: true } },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "timeSlots"),
  ),
  {
    ...DEFAULT_INPUT,
    timeSlots: [
      {
        id: "a",
        label: "Demo slot A",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    timeSlots: [
      {
        id: "a",
        label: "Demo slot A",
      },
      {
        id: "a",
        label: "Demo slot A",
      },
      {
        id: "a",
        label: "Demo slot A",
      },
      {
        id: "a",
        label: "Demo slot A",
      },
      {
        id: "a",
        label: "Demo slot A",
      },
      {
        id: "a",
        label: "Demo slot A",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    timeSlots: [
      { ...DEFAULT_INPUT.timeSlots[0], extra: true },
      DEFAULT_INPUT.timeSlots[1],
      DEFAULT_INPUT.timeSlots[2],
    ],
  },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "requests"),
  ),
  {
    ...DEFAULT_INPUT,
    requests: [
      {
        id: "a",
        participant: "Demo maker A",
        requestedSlotId: "a",
        agreedSlotId: "a",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      {
        id: "a",
        participant: "Demo maker A",
        requestedSlotId: "a",
        agreedSlotId: "a",
      },
      {
        id: "a",
        participant: "Demo maker A",
        requestedSlotId: "a",
        agreedSlotId: "a",
      },
      {
        id: "a",
        participant: "Demo maker A",
        requestedSlotId: "a",
        agreedSlotId: "a",
      },
      {
        id: "a",
        participant: "Demo maker A",
        requestedSlotId: "a",
        agreedSlotId: "a",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      { ...DEFAULT_INPUT.requests[0], extra: true },
      DEFAULT_INPUT.requests[1],
    ],
  },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "labels"),
  ),
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(
      ([field]) => field !== "showOriginalRequests",
    ),
  ),
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(
      ([field]) => field !== "showUsageTurns",
    ),
  ),
  { ...DEFAULT_INPUT, machine: { ...DEFAULT_INPUT.machine, kind: "invalid" } },
  {
    ...DEFAULT_INPUT,
    machine: {
      ...DEFAULT_INPUT.machine,
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    timeSlots: [
      { ...DEFAULT_INPUT.timeSlots[0], id: "WWWWWWWWWWWWWWWWW" },
      DEFAULT_INPUT.timeSlots[1],
      DEFAULT_INPUT.timeSlots[2],
    ],
  },
  {
    ...DEFAULT_INPUT,
    timeSlots: [
      { ...DEFAULT_INPUT.timeSlots[0], label: "WWWWWWWWWWWWWWWWWWW" },
      DEFAULT_INPUT.timeSlots[1],
      DEFAULT_INPUT.timeSlots[2],
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      { ...DEFAULT_INPUT.requests[0], id: "WWWWWWWWWWWWWWWWW" },
      DEFAULT_INPUT.requests[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      {
        ...DEFAULT_INPUT.requests[0],
        participant: "WWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.requests[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      { ...DEFAULT_INPUT.requests[0], requestedSlotId: "WWWWWWWWWWWWWWWWW" },
      DEFAULT_INPUT.requests[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      requested: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      agreed: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      unresolved: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    timeSlots: [
      DEFAULT_INPUT.timeSlots[0],
      { ...DEFAULT_INPUT.timeSlots[1], id: "a" },
      DEFAULT_INPUT.timeSlots[2],
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      DEFAULT_INPUT.requests[0],
      { ...DEFAULT_INPUT.requests[1], id: "a" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      { ...DEFAULT_INPUT.requests[0], requestedSlotId: "missing" },
      DEFAULT_INPUT.requests[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      { ...DEFAULT_INPUT.requests[0], agreedSlotId: "missing" },
      DEFAULT_INPUT.requests[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      DEFAULT_INPUT.requests[0],
      { ...DEFAULT_INPUT.requests[1], agreedSlotId: "a" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      DEFAULT_INPUT.requests[0],
      { ...DEFAULT_INPUT.requests[1], requestedSlotId: "b" },
    ],
  },
];
