import type { Input } from "./QueueRelief.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  items: [
    {
      id: "a",
      label: "A",
    },
    {
      id: "b",
      label: "B",
    },
    {
      id: "c",
      label: "C",
    },
    {
      id: "d",
      label: "D",
    },
    {
      id: "e",
      label: "E",
    },
  ],
  serviceSlots: [
    {
      id: "one",
      label: "Desk A",
      initiallyOpen: true,
    },
    {
      id: "two",
      label: "Desk B",
      initiallyOpen: false,
    },
  ],
  queueLabel: "Waiting",
  completionLabel: "Handled",
  capacityChangeLabel: "Another desk opens",
  showItemLabels: true,
};
/** Ordered work and named bays cover minimal and expanded capacities. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      items: [
        { id: "", label: "" },
        { id: " 二", label: "" },
        { id: "三 ", label: "" },
      ],
      serviceSlots: [
        { id: "", label: "", initiallyOpen: false },
        { id: " 二", label: "", initiallyOpen: true },
      ],
      queueLabel: "Q",
      completionLabel: "C",
      capacityChangeLabel: "Open",
      showItemLabels: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `item ${index}`,
        label: "W".repeat(14),
      })),
      serviceSlots: Array.from({ length: 4 }, (_, index) => ({
        id: `slot ${index}`,
        label: "W".repeat(18),
        initiallyOpen: index === 0,
      })),
      queueLabel: "W".repeat(24),
      completionLabel: "W".repeat(24),
      capacityChangeLabel: "W".repeat(36),
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      items: [...DEFAULT_INPUT.items].reverse(),
      serviceSlots: [
        { id: "a", label: "One", initiallyOpen: false },
        { id: "b", label: "Two", initiallyOpen: true },
        { id: "c", label: "Three", initiallyOpen: true },
      ],
    },
  },
  {
    id: "long-backlog",
    input: {
      ...DEFAULT_INPUT,
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `item ${index}`,
        label: "W".repeat(14),
      })),
    },
  },
];
/** A visible initial backlog and real expansion are both mandatory. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, items: [] },
  {
    ...DEFAULT_INPUT,
    items: [
      DEFAULT_INPUT.items[0],
      DEFAULT_INPUT.items[0],
      DEFAULT_INPUT.items[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    serviceSlots: DEFAULT_INPUT.serviceSlots.map((slot) => ({
      ...slot,
      initiallyOpen: true,
    })),
  },
  {
    ...DEFAULT_INPUT,
    serviceSlots: DEFAULT_INPUT.serviceSlots.map((slot) => ({
      ...slot,
      initiallyOpen: false,
    })),
  },
  {
    ...DEFAULT_INPUT,
    serviceSlots: [
      DEFAULT_INPUT.serviceSlots[0],
      DEFAULT_INPUT.serviceSlots[0],
    ],
  },
  {
    ...DEFAULT_INPUT,
    items: DEFAULT_INPUT.items.slice(0, 3),
    serviceSlots: Array.from({ length: 4 }, (_, index) => ({
      id: String(index),
      label: "",
      initiallyOpen: index < 3,
    })),
  },
];
