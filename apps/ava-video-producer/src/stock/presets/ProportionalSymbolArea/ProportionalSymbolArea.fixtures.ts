import type { Input } from "./ProportionalSymbolArea.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  sites: [
    {
      id: "a",
      label: "Site A",
      x: 25,
      y: 45,
      value: 1,
    },
    {
      id: "b",
      label: "Site B",
      x: 70,
      y: 55,
      value: 4,
    },
  ],
  areaPerUnit: 400,
  unitLabel: "items",
  showRadiusComparison: true,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Default, minimum, dense and changed-input cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: { ...DEFAULT_INPUT } },
  {
    id: "minimum",
    input: { ...DEFAULT_INPUT, areaPerUnit: 100, showRadiusComparison: false },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      sites: [
        { id: "0", label: "WWWWWWWWWWWWWWWW", x: 25, y: 25, value: 9 },
        { id: "1", label: "WWWWWWWWWWWWWWWW", x: 75, y: 25, value: 9 },
        { id: "2", label: "WWWWWWWWWWWWWWWW", x: 25, y: 75, value: 9 },
        { id: "3", label: "WWWWWWWWWWWWWWWW", x: 75, y: 75, value: 9 },
      ],
      areaPerUnit: 900,
      copy: {
        context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        before: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        after: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      sites: [
        { id: "a", label: "Site A", x: 27, y: 45, value: 2 },
        { id: "b", label: "Site B", x: 72, y: 55, value: 8 },
      ],
      showRadiusComparison: false,
    },
  },
];
/** Strict-schema rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    sites: [
      { id: "a", label: "Site A", x: 0, y: 45, value: 1 },
      { id: "b", label: "Site B", x: 0, y: 55, value: 4 },
    ],
  },
  {
    ...DEFAULT_INPUT,
    sites: [
      { id: "a", label: "Site A", x: 50, y: 50, value: 1 },
      { id: "b", label: "Site B", x: 50, y: 50, value: 4 },
    ],
  },
  { ...DEFAULT_INPUT, areaPerUnit: 901 },
  {
    ...DEFAULT_INPUT,
    sites: [
      { id: "a", label: "Site A", x: 25, y: 45, value: 0 },
      { id: "b", label: "Site B", x: 70, y: 55, value: 0 },
    ],
  },
  {
    ...DEFAULT_INPUT,
    sites: [
      { id: "a", label: "Site A", x: 25, y: 45, value: 1.5 },
      { id: "b", label: "Site B", x: 70, y: 55, value: 1.5 },
    ],
  },
];
