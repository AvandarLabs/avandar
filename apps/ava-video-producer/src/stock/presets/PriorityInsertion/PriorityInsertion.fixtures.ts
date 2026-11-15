import type { Input } from "./PriorityInsertion.schema";
/** Fictional queue with one explicit insertion. */
export const DEFAULT_INPUT: Input = {
  queue: [
    {
      id: "a",
      label: "Draft A",
    },
    {
      id: "b",
      label: "Draft B",
    },
    {
      id: "c",
      label: "Draft C",
    },
    {
      id: "d",
      label: "Draft D",
    },
  ],
  incomingItem: {
    id: "urgent",
    label: "Time-sensitive",
  },
  insertBeforeId: "b",
  priorityLabel: "Move ahead of Draft B",
  serviceLabel: "Next to start",
  showOriginalPositions: true,
};
const dense: Input = {
  ...DEFAULT_INPUT,
  queue: Array.from({ length: 5 }, (_, index) => ({
    id: `queue ${index}`,
    label: "W".repeat(16),
  })),
  incomingItem: { id: "incoming 界", label: "W".repeat(18) },
  insertBeforeId: "queue 0",
  priorityLabel: "W".repeat(34),
  serviceLabel: "W".repeat(22),
};
/**
 * Minimum exercises empty references and dense preserves every original
 * slot.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      queue: [
        { id: "", label: "A" },
        { id: " ", label: "B" },
        { id: "界", label: "C" },
      ],
      insertBeforeId: "",
      incomingItem: { id: "new", label: "N" },
      priorityLabel: "P",
      serviceLabel: "S",
      showOriginalPositions: false,
    },
  },
  { id: "dense", input: dense },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      incomingItem: { id: "", label: "Last-minute item" },
      insertBeforeId: "d",
      showOriginalPositions: false,
      priorityLabel: "One item moves back",
    },
  },
];
/** Invalid references, bounds and complete-document shapes. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, queue: [] },
  { ...dense, queue: [...dense.queue, { id: "extra", label: "X" }] },
  { ...DEFAULT_INPUT, insertBeforeId: "missing" },
  { ...DEFAULT_INPUT, queue: [DEFAULT_INPUT.queue[0], ...DEFAULT_INPUT.queue] },
  { ...DEFAULT_INPUT, incomingItem: DEFAULT_INPUT.queue[0] },
  {
    ...DEFAULT_INPUT,
    incomingItem: { ...DEFAULT_INPUT.incomingItem, label: "W".repeat(19) },
  },
  {
    ...DEFAULT_INPUT,
    incomingItem: { ...DEFAULT_INPUT.incomingItem, extra: true },
  },
];
