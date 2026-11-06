import type { Input } from "./ProtectedWorkBoundary.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  slots: [
    {
      id: "a",
      label: "Block A",
      kind: "work",
      workLabel: "Draft guide",
    },
    {
      id: "b",
      label: "Block B",
      kind: "work",
      workLabel: "Review notes",
    },
    {
      id: "c",
      label: "Block C",
      kind: "rest",
      workLabel: null,
    },
    {
      id: "d",
      label: "Block D",
      kind: "learning",
      workLabel: null,
    },
  ],
  request: {
    label: "New review",
    requestedSlotId: "c",
    placement: "defer",
    agreedSlotId: null,
  },
  workerLabel: "Team member",
  labels: {
    work: "Work",
    rest: "Rest",
    learning: "Learning",
    community: "Community",
    protected: "Protected time",
    deferred: "Still to schedule",
    rescheduled: "Agreed work slot",
    unit: "Illustrative block",
    example: "Fictional schedule",
  },
  showSlotLabels: true,
  protectedPattern: "hatch",
};
/** Minimum, dense and changed authored cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      slots: [
        DEFAULT_INPUT.slots[0],
        DEFAULT_INPUT.slots[1],
        DEFAULT_INPUT.slots[2],
      ],
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      slots: [
        {
          ...DEFAULT_INPUT.slots[0],
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          workLabel: "WWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          ...DEFAULT_INPUT.slots[1],
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          workLabel: "WWWWWWWWWWWWWWWWWWWWWW",
        },
        { ...DEFAULT_INPUT.slots[2], label: "WWWWWWWWWWWWWWWWWWWWWW" },
        { ...DEFAULT_INPUT.slots[3], label: "WWWWWWWWWWWWWWWWWWWWWW" },
        {
          id: "slot-0",
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          kind: "community",
          workLabel: null,
        },
        {
          id: "slot-1",
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          kind: "work",
          workLabel: null,
        },
        {
          id: "slot-2",
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          kind: "rest",
          workLabel: null,
        },
        {
          id: "slot-3",
          label: "WWWWWWWWWWWWWWWWWWWWWW",
          kind: "learning",
          workLabel: null,
        },
      ],
      request: { ...DEFAULT_INPUT.request, label: "WWWWWWWWWWWWWWWWWWWWWWWW" },
      workerLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      labels: {
        ...DEFAULT_INPUT.labels,
        work: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        rest: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        learning: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        community: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        protected: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        deferred: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        rescheduled: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        unit: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      slots: [
        DEFAULT_INPUT.slots[0],
        DEFAULT_INPUT.slots[1],
        DEFAULT_INPUT.slots[2],
        DEFAULT_INPUT.slots[3],
        { id: "empty", label: "Block E", kind: "work", workLabel: null },
      ],
      request: {
        ...DEFAULT_INPUT.request,
        placement: "reschedule",
        agreedSlotId: "empty",
      },
      showSlotLabels: false,
      protectedPattern: "dots",
    },
  },
];
/** Rejected complete and malformed documents. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, slots: [] },
  {
    ...DEFAULT_INPUT,
    request: {
      ...DEFAULT_INPUT.request,
      placement: "reschedule",
      agreedSlotId: "a",
    },
  },
  {
    ...DEFAULT_INPUT,
    request: {
      ...DEFAULT_INPUT.request,
      placement: "reschedule",
      agreedSlotId: "c",
    },
  },
  {
    ...DEFAULT_INPUT,
    request: { ...DEFAULT_INPUT.request, requestedSlotId: "missing" },
  },
  {
    ...DEFAULT_INPUT,
    request: { ...DEFAULT_INPUT.request, agreedSlotId: "a" },
  },
];
