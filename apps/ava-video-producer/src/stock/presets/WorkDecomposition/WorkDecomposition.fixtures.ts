import type { Input } from "./WorkDecomposition.schema";
/** Complete fictional effort allocation. */
export const DEFAULT_INPUT: Input = {
  parentLabel: "Sample release",
  workItems: [
    {
      id: "draft",
      label: "Draft",
      effort: 3,
    },
    {
      id: "review",
      label: "Review",
      effort: 2,
    },
    {
      id: "package",
      label: "Package",
      effort: 1,
    },
  ],
  unitLabel: "effort units",
  groupingLabel: "Work packages",
  showEffortValues: true,
  partitionLayout: "alternating-cuts",
};
const dense: Input = {
  ...DEFAULT_INPUT,
  parentLabel: "W".repeat(28),
  unitLabel: "W".repeat(16),
  groupingLabel: "W".repeat(26),
  workItems: Array.from({ length: 6 }, (_, index) => ({
    id: `piece ${index}`,
    label: "W".repeat(18),
    effort: index === 0 ? 1 : 5,
  })),
};
/** Minimum includes an accepted empty identity and both layouts are covered. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      parentLabel: "P",
      unitLabel: "U",
      groupingLabel: "G",
      workItems: [
        { id: "", label: "A", effort: 1 },
        { id: " ", label: "B", effort: 1 },
        { id: "界", label: "C", effort: 1 },
      ],
      showEffortValues: false,
      partitionLayout: "strips",
    },
  },
  { id: "dense", input: dense },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      partitionLayout: "strips",
      workItems: DEFAULT_INPUT.workItems.map((item, index) => ({
        ...item,
        effort: 5 - index,
      })),
    },
  },
];
/** Strict shape, collection and denominator constraints. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, workItems: DEFAULT_INPUT.workItems.slice(0, 2) },
  {
    ...dense,
    workItems: [...dense.workItems, { id: "extra", label: "E", effort: 1 }],
  },
  {
    ...DEFAULT_INPUT,
    workItems: [
      DEFAULT_INPUT.workItems[0],
      DEFAULT_INPUT.workItems[0],
      DEFAULT_INPUT.workItems[2],
    ],
  },
  ...[0, 6, 1.5, Infinity].map((effort) => ({
    ...DEFAULT_INPUT,
    workItems: DEFAULT_INPUT.workItems.map((item, index) =>
      index === 0 ? { ...item, effort } : item,
    ),
  })),
  { ...DEFAULT_INPUT, partitionLayout: "rows" },
];
