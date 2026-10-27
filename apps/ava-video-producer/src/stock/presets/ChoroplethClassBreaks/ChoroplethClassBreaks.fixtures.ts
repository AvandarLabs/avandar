import type { Input } from "./ChoroplethClassBreaks.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  zones: [
    {
      id: "a",
      label: "Zone A",
      value: 2,
    },
    {
      id: "b",
      label: "Zone B",
      value: 4,
    },
    {
      id: "c",
      label: "Zone C",
      value: 9,
    },
    {
      id: "d",
      label: "Zone D",
      value: null,
    },
  ],
  schemes: [
    {
      label: "Equal-width example",
      breaks: [0, 5, 10],
    },
    {
      label: "Alternative breaks",
      breaks: [0, 3, 10],
    },
  ],
  unitLabel: "recorded items",
  noDataLabel: "No data reported",
  showValueRuler: true,
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
    input: {
      ...DEFAULT_INPUT,
      zones: [
        { id: "", label: "", value: 2 },
        { id: "b", label: "", value: 4 },
        { id: "c", label: "", value: 9 },
      ],
      showValueRuler: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      zones: [
        { id: "0", label: "WWWWWWWWWWWWWWWW", value: 0 },
        { id: "1", label: "WWWWWWWWWWWWWWWW", value: 2 },
        { id: "2", label: "WWWWWWWWWWWWWWWW", value: 4 },
        { id: "3", label: "WWWWWWWWWWWWWWWW", value: 6 },
        { id: "4", label: "WWWWWWWWWWWWWWWW", value: 8 },
        { id: "5", label: "WWWWWWWWWWWWWWWW", value: null },
      ],
      schemes: [
        { label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW", breaks: [0, 5, 10] },
        { label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW", breaks: [0, 3, 10] },
      ],
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
      schemes: [
        { label: "Same first", breaks: [0, 4, 10] },
        { label: "Same second", breaks: [0, 4, 10] },
      ],
      showValueRuler: false,
    },
  },
];
/** Strict-schema rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    schemes: [
      { label: "a", breaks: [0, 5, 5] },
      { label: "Alternative breaks", breaks: [0, 3, 10] },
    ],
  },
  {
    ...DEFAULT_INPUT,
    schemes: [
      { label: "a", breaks: [0, 5, 8] },
      { label: "Alternative breaks", breaks: [0, 3, 10] },
    ],
  },
  {
    ...DEFAULT_INPUT,
    zones: [
      { id: "a", label: "Zone A", value: 11 },
      { id: "b", label: "Zone B", value: 11 },
      { id: "c", label: "Zone C", value: 11 },
      { id: "d", label: "Zone D", value: 11 },
    ],
  },
  { ...DEFAULT_INPUT, schemes: [] },
];
