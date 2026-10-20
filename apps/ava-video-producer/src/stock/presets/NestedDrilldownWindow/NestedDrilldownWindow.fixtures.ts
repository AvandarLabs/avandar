import type { Input } from "./NestedDrilldownWindow.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  records: [
    {
      id: "a",
      label: "Paper",
      groups: ["North", "Stored"],
    },
    {
      id: "b",
      label: "Ink",
      groups: ["North", "Review"],
    },
    {
      id: "c",
      label: "Labels",
      groups: ["South", "Stored"],
    },
    {
      id: "d",
      label: "Folders",
      groups: ["North", "Stored"],
    },
  ],
  dimensions: ["Area", "State"],
  selectionPath: ["North", "Stored"],
  labels: {
    title: "Fictional supply drilldown",
    root: "All sample records",
    detail: "Selected records",
    context: "Parent context",
  },
  retainContext: true,
  selectionStyle: "window",
};
/** Exact prefix selections with one-level, dense and context-free variants. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      records: Array.from({ length: 4 }, (_, index) => ({
        id: index === 0 ? "" : ` 二 ${index}`,
        label: "",
        groups: [" ", " "],
      })),
      dimensions: ["A", "B"],
      selectionPath: [" "],
      labels: { ...DEFAULT_INPUT.labels, title: "" },
      retainContext: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      records: Array.from({ length: 8 }, (_, index) => ({
        id: `record ${index}`,
        label: "W".repeat(22),
        groups: [
          `${"N".repeat(17)}${index % 3}`,
          `${"S".repeat(17)}${index % 2}`,
        ],
      })),
      dimensions: ["W".repeat(22), "W".repeat(22)],
      selectionPath: [`${"N".repeat(17)}0`, `${"S".repeat(17)}0`],
      labels: {
        title: "W".repeat(42),
        root: "W".repeat(28),
        detail: "W".repeat(28),
        context: "W".repeat(28),
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      selectionPath: ["North"],
      retainContext: false,
      selectionStyle: "inset-frame",
    },
  },
  {
    id: "all-detail",
    input: {
      ...DEFAULT_INPUT,
      records: Array.from({ length: 8 }, (_, index) => ({
        id: `detail ${index}`,
        label: "W".repeat(22),
        groups: ["North", "Stored"],
      })),
      selectionPath: ["North"],
    },
  },
];
/** Invalid prefixes and collection memberships never fabricate details. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, selectionPath: [] },
  { ...DEFAULT_INPUT, selectionPath: ["South", "Review"] },
  { ...DEFAULT_INPUT, selectionPath: ["north"] },
  {
    ...DEFAULT_INPUT,
    records: DEFAULT_INPUT.records.map((record) => ({ ...record, id: "" })),
  },
  {
    ...DEFAULT_INPUT,
    records: DEFAULT_INPUT.records.map((record, index) => ({
      ...record,
      groups: [String(index), "Stored"],
    })),
  },
  { ...DEFAULT_INPUT, dimensions: ["Only"] },
];
