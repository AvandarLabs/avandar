import type { Input } from "./DuplicateReviewStack.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  title: "Fictional duplicate review",
  groups: [
    {
      id: "paper",
      label: "Possible match",
      records: [
        {
          id: "A1",
          label: "Paper stock",
          comparisonValue: "PAPER-01",
        },
        {
          id: "A2",
          label: "Paper register",
          comparisonValue: "PAPER-01",
        },
      ],
      retainedId: "A1",
    },
    {
      id: "ink",
      label: "Possible match",
      records: [
        {
          id: "B1",
          label: "Ink stock",
          comparisonValue: "INK-02",
        },
        {
          id: "B2",
          label: "Ink note",
          comparisonValue: "INK-02",
        },
      ],
      retainedId: null,
    },
  ],
  comparisonFieldLabel: "Sample item code",
  labels: {
    retained: "Retained example",
    unresolved: "Review required",
    alternatives: "Candidate alternatives",
  },
  finalView: "offset-stack",
  showRecordIds: true,
};
/** Complete candidate groups with explicit empty, dense and changed choices. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      title: "X",
      groups: [
        {
          id: "",
          label: "",
          records: [
            { id: "", label: "", comparisonValue: "" },
            { id: " 二", label: "", comparisonValue: "" },
          ],
          retainedId: "",
        },
      ],
      showRecordIds: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      title: "W".repeat(44),
      comparisonFieldLabel: "W".repeat(28),
      groups: Array.from({ length: 2 }, (_, groupIndex) => ({
        id: `group ${groupIndex}`,
        label: "W".repeat(24),
        records: Array.from({ length: 3 }, (_record, index) => ({
          id: `G${groupIndex}${"W".repeat(9)}${index}`,
          label: "W".repeat(26),
          comparisonValue: "W".repeat(22),
        })),
        retainedId: groupIndex === 0 ? `G0${"W".repeat(9)}1` : null,
      })),
      labels: {
        retained: "W".repeat(28),
        unresolved: "W".repeat(28),
        alternatives: "W".repeat(28),
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      groups: DEFAULT_INPUT.groups.map((group) => ({
        ...group,
        retainedId: group.records[1].id,
      })),
      finalView: "comparison-pair",
    },
  },
];
/** Foreign retention references and identity collisions fail validation. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, groups: [] },
  {
    ...DEFAULT_INPUT,
    groups: DEFAULT_INPUT.groups.map((group) => ({
      ...group,
      retainedId: "absent",
    })),
  },
  {
    ...DEFAULT_INPUT,
    groups: [
      { ...DEFAULT_INPUT.groups[0], retainedId: "B1" },
      DEFAULT_INPUT.groups[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    groups: [
      {
        ...DEFAULT_INPUT.groups[0],
        records: [
          DEFAULT_INPUT.groups[0].records[0],
          DEFAULT_INPUT.groups[0].records[0],
        ],
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    groups: [DEFAULT_INPUT.groups[0], DEFAULT_INPUT.groups[0]],
  },
  { ...DEFAULT_INPUT, title: "" },
];
