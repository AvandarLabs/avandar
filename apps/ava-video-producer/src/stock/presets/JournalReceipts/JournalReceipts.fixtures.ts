import type { Input } from "./JournalReceipts.schema";
/** Complete fictional journal with one intentionally unacknowledged entry. */
export const DEFAULT_INPUT: Input = {
  entries: [
    { id: "a", label: "Example note A" },
    { id: "b", label: "Example note B" },
    { id: "c", label: "Example note C" },
  ],
  receipts: [
    { entryId: "a", label: "Receipt A" },
    { entryId: "b", label: "Receipt B" },
  ],
  copy: {
    journal: "Example local journal",
    receiptPocket: "Example service receipts",
    disconnected: "Waiting for connection",
    reconnected: "Connection returned",
    pending: "Awaiting receipt",
    acknowledged: "Receipt recorded",
    example: "Fictional example",
  },
  foldDirection: "horizontal",
  showIdentifiers: true,
  showLabels: true,
};
/** Complete extremes and a changed receipt order expose identity matching. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      entries: [{ id: "a", label: "A" }],
      receipts: [],
      foldDirection: "vertical",
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      entries: Array.from({ length: 5 }, (_, index) => ({
        id: `${"界".repeat(11)}${index}`,
        label: "W".repeat(24),
      })),
      receipts: Array.from({ length: 5 }, (_, index) => ({
        entryId: `${"界".repeat(11)}${4 - index}`,
        label: "W".repeat(20),
      })),
      copy: Object.fromEntries(
        Object.keys(DEFAULT_INPUT.copy).map((key) => [key, "W".repeat(32)]),
      ) as Input["copy"],
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      entries: [
        { id: "note α", label: "Retained note A" },
        { id: "note β", label: "Retained note B" },
        { id: "note γ", label: "Retained note C" },
      ],
      receipts: [{ entryId: "note γ", label: "Only receipt C" }],
      foldDirection: "vertical",
    },
  },
];
/**
 * Strict documents reject impossible receipt identities and duplicated
 * obligations.
 */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, entries: [] },
  { ...DEFAULT_INPUT, entries: Array(6).fill(DEFAULT_INPUT.entries[0]) },
  {
    ...DEFAULT_INPUT,
    entries: [DEFAULT_INPUT.entries[0], DEFAULT_INPUT.entries[0]],
  },
  { ...DEFAULT_INPUT, entries: [{ id: "", label: "A" }] },
  { ...DEFAULT_INPUT, receipts: [{ entryId: "missing", label: "Receipt" }] },
  {
    ...DEFAULT_INPUT,
    receipts: [DEFAULT_INPUT.receipts[0], DEFAULT_INPUT.receipts[0]],
  },
  { ...DEFAULT_INPUT, receipts: [{ entryId: "a", label: "W".repeat(21) }] },
  {
    ...DEFAULT_INPUT,
    entries: [{ ...DEFAULT_INPUT.entries[0], label: "W".repeat(25) }],
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: true } },
  { ...DEFAULT_INPUT, foldDirection: "diagonal" },
];
