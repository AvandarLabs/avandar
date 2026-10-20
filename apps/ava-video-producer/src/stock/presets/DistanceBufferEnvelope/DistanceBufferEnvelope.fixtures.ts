import type { Input } from "./DistanceBufferEnvelope.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  origin: { label: "Fictional facility", x: 50, y: 50 },
  locations: [
    { id: "a", label: "Location A", x: 60, y: 50 },
    { id: "b", label: "Location B", x: 70, y: 70 },
    { id: "c", label: "Location C", x: 90, y: 50 },
  ],
  radiusUnits: 30,
  labels: {
    unit: "schematic units",
    inside: "Within radius",
    outside: "Beyond radius",
    qualifier: "Straight-line distance, not travel time",
  },
  showDistances: true,
  copy: {
    context: "Fictional schematic example",
    source: "Supplied data",
    result: "Derived illustration",
  },
};
/** Alternate input and toggles. */
export const CHANGED_INPUT: Input = {
  origin: { label: "Fictional facility", x: 50, y: 50 },
  locations: [
    { id: "a", label: "Location A", x: 60, y: 50 },
    { id: "b", label: "Location B", x: 70, y: 70 },
    { id: "c", label: "Location C", x: 90, y: 50 },
  ],
  radiusUnits: 10,
  labels: {
    unit: "schematic units",
    inside: "Within radius",
    outside: "Beyond radius",
    qualifier: "Straight-line distance, not travel time",
  },
  showDistances: false,
  copy: {
    context: "Fictional schematic example",
    source: "Supplied data",
    result: "Derived illustration",
  },
};
/** Default, minimum, dense and changed documents. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      origin: { label: "Fictional facility", x: 50, y: 50 },
      locations: [
        { id: "a", label: "", x: 60, y: 50 },
        { id: "b", label: "Location B", x: 70, y: 70 },
      ],
      radiusUnits: 1e-12,
      labels: {
        unit: "schematic units",
        inside: "Within radius",
        outside: "Beyond radius",
        qualifier: "Straight-line distance, not travel time",
      },
      showDistances: true,
      copy: {
        context: "Fictional schematic example",
        source: "Supplied data",
        result: "Derived illustration",
      },
    },
  },
  {
    id: "dense",
    input: {
      origin: { label: "MMMMMMMMMMMMMMMMMMMMMMMM", x: 50, y: 50 },
      locations: [
        { id: "0", label: "MMMMMMMMMMMMMMMMMMMM", x: 50, y: 50 },
        { id: "1", label: "MMMMMMMMMMMMMMMMMMMM", x: 50, y: 50 },
        { id: "2", label: "MMMMMMMMMMMMMMMMMMMM", x: 50, y: 50 },
        { id: "3", label: "MMMMMMMMMMMMMMMMMMMM", x: 50, y: 50 },
        { id: "4", label: "MMMMMMMMMMMMMMMMMMMM", x: 50, y: 50 },
        { id: "5", label: "MMMMMMMMMMMMMMMMMMMM", x: 50, y: 50 },
      ],
      radiusUnits: 40,
      labels: {
        unit: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        inside: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        outside: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        qualifier: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showDistances: true,
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        source: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        result: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
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
  { ...DEFAULT_INPUT, origin: { ...DEFAULT_INPUT.origin, x: 20 } },
  {
    ...DEFAULT_INPUT,
    locations: [DEFAULT_INPUT.locations[0], DEFAULT_INPUT.locations[0]],
  },
  {
    ...DEFAULT_INPUT,
    locations: DEFAULT_INPUT.locations.map((location) => ({
      ...location,
      id: "",
    })),
  },
];
