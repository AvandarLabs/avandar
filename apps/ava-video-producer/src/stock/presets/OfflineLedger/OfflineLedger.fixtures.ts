import type { Input } from "./OfflineLedger.schema";
/** Complete fictional local notebook. */
export const DEFAULT_INPUT: Input = {
  entries: [
    { id: "note-a", label: "Example stop", value: "North shed" },
    { id: "note-b", label: "Example note", value: "Blue crate" },
    { id: "note-c", label: "Example tag", value: "Follow up" },
  ],
  surfaceLabel: "Example field notebook",
  copy: {
    connected: "Connection available",
    offline: "Connection unavailable",
    storage: "Saved on this device",
    retained: "Entries retained",
    example: "Fictional example",
  },
  deviceShape: "tablet",
  showStorageImpressions: true,
  showLabels: true,
};
/** Default, collection extremes, and source-retention binding. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      entries: [{ id: "", label: "", value: "" }],
      deviceShape: "notebook",
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      entries: Array.from({ length: 4 }, (_, index) => ({
        id: `entry-${index}`,
        label: "W".repeat(22),
        value: "W".repeat(28),
      })),
      surfaceLabel: "W".repeat(32),
      copy: Object.fromEntries(
        Object.keys(DEFAULT_INPUT.copy).map((key) => [key, "W".repeat(32)]),
      ) as Input["copy"],
      deviceShape: "laptop",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      entries: [
        {
          id: "source α",
          label: "Original document",
          value: "Fictional PDF retained",
        },
        {
          id: "table β",
          label: "Extracted table",
          value: "Separate derived data",
        },
      ],
      surfaceLabel: "Example source retention",
      deviceShape: "notebook",
    },
  },
];
/** Invalid bounds and incomplete documents cannot invoke partial defaults. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, entries: [] },
  { ...DEFAULT_INPUT, entries: Array(5).fill(DEFAULT_INPUT.entries[0]) },
  {
    ...DEFAULT_INPUT,
    entries: [DEFAULT_INPUT.entries[0], DEFAULT_INPUT.entries[0]],
  },
  {
    ...DEFAULT_INPUT,
    entries: [{ ...DEFAULT_INPUT.entries[0], id: "x".repeat(21) }],
  },
  {
    ...DEFAULT_INPUT,
    entries: [{ ...DEFAULT_INPUT.entries[0], label: "x".repeat(23) }],
  },
  {
    ...DEFAULT_INPUT,
    entries: [{ ...DEFAULT_INPUT.entries[0], value: "x".repeat(29) }],
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: true } },
  { ...DEFAULT_INPUT, surfaceLabel: "x".repeat(33) },
  { ...DEFAULT_INPUT, deviceShape: "phone" },
];
