import type { Input } from "./BoundedLocationDisplacement.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  locations: [
    { id: "a", label: "Location A", x: 30, y: 40, offsetX: 6, offsetY: 4 },
    { id: "b", label: "Location B", x: 70, y: 60, offsetX: -5, offsetY: 3 },
  ],
  radiusUnits: 10,
  labels: {
    source: "Retained source position",
    display: "Display copy",
    approximate: "Approximate location",
    bound: "Maximum displacement",
  },
  showLocalOriginal: true,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Alternate input and toggles. */
export const CHANGED_INPUT: Input = {
  locations: [
    { id: "a", label: "Location A", x: 30, y: 40, offsetX: 0, offsetY: 0 },
    { id: "b", label: "Location B", x: 70, y: 60, offsetX: -5, offsetY: 3 },
  ],
  radiusUnits: 10,
  labels: {
    source: "Retained source position",
    display: "Display copy",
    approximate: "Approximate location",
    bound: "Maximum displacement",
  },
  showLocalOriginal: false,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Default, minimum, dense and changed documents. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      locations: [{ id: "", label: "", x: 10, y: 10, offsetX: 0, offsetY: 0 }],
      radiusUnits: 1e-12,
      labels: {
        source: "Retained source position",
        display: "Display copy",
        approximate: "Approximate location",
        bound: "Maximum displacement",
      },
      showLocalOriginal: true,
      copy: {
        context: "Fictional schematic geography",
        before: "Supplied observations",
        after: "Derived display",
      },
    },
  },
  {
    id: "dense",
    input: {
      locations: [
        {
          id: "MMMMMMMMMMMM",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 10,
          y: 10,
          offsetX: -10,
          offsetY: 0,
        },
        {
          id: "界",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 90,
          y: 90,
          offsetX: 10,
          offsetY: 0,
        },
        {
          id: "a b",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          offsetX: 6,
          offsetY: 8,
        },
      ],
      radiusUnits: 10,
      labels: {
        source: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        display: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        approximate: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        bound: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showLocalOriginal: true,
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        before: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        after: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
    },
  },
  { id: "changed", input: CHANGED_INPUT },
];
/** Structural and semantic rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, locations: [] },
  { ...DEFAULT_INPUT, radiusUnits: 0 },
  { ...DEFAULT_INPUT, radiusUnits: 1 },
  {
    ...DEFAULT_INPUT,
    locations: [DEFAULT_INPUT.locations[0], DEFAULT_INPUT.locations[0]],
  },
  {
    ...DEFAULT_INPUT,
    locations: [{ ...DEFAULT_INPUT.locations[0], id: "x".repeat(13) }],
  },
  {
    ...DEFAULT_INPUT,
    locations: [
      { ...DEFAULT_INPUT.locations[0], x: 10, offsetX: -11, offsetY: 0 },
    ],
    radiusUnits: 20,
  },
];
