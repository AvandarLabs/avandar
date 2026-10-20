import type { Input } from "./ConvoyRouteDetour.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  locations: {
    depotLabel: "Example depot",
    destinationLabel: "Willow reception",
    junctionLabel: "Route choice",
  },
  routes: [
    {
      id: "direct",
      label: "Original road",
      role: "blocked",
      points: [
        {
          x: 0.1,
          y: 0.5,
        },
        {
          x: 0.35,
          y: 0.5,
        },
        {
          x: 0.7,
          y: 0.5,
        },
        {
          x: 0.9,
          y: 0.5,
        },
      ],
    },
    {
      id: "alternative",
      label: "Agreed detour",
      role: "detour",
      points: [
        {
          x: 0.1,
          y: 0.5,
        },
        {
          x: 0.35,
          y: 0.5,
        },
        {
          x: 0.4,
          y: 0.25,
        },
        {
          x: 0.75,
          y: 0.25,
        },
        {
          x: 0.9,
          y: 0.5,
        },
      ],
    },
  ],
  obstruction: {
    segmentIndex: 1,
    kind: "bridge-closure",
    label: "Example closure",
  },
  vehicle: "truck",
  scenarioCaption: "Fictional route. Schematic map.",
  showRouteLabels: true,
};
/** Changed author input used by the behavioral test. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  vehicle: "cargo-bike",
  showRouteLabels: false,
};
/** Rejected incomplete, unknown and invalid authored inputs. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, unexpected: true },
  {},
  {
    ...DEFAULT_INPUT,
    obstruction: { ...DEFAULT_INPUT.obstruction, segmentIndex: 9 },
  },
];

/** Smallest accepted collection example, including literal empty IDs. */
export const MINIMUM_INPUT: Input = {
  locations: { depotLabel: "", destinationLabel: "", junctionLabel: "" },
  routes: [
    {
      id: "",
      label: "Original road",
      role: "blocked",
      points: [
        { x: 0.1, y: 0.5 },
        { x: 0.35, y: 0.5 },
        { x: 0.7, y: 0.5 },
        { x: 0.9, y: 0.5 },
      ],
    },
    {
      id: "",
      label: "Agreed detour",
      role: "detour",
      points: [
        { x: 0.1, y: 0.5 },
        { x: 0.35, y: 0.5 },
        { x: 0.4, y: 0.25 },
        { x: 0.75, y: 0.25 },
        { x: 0.9, y: 0.5 },
      ],
    },
  ],
  obstruction: {
    segmentIndex: 1,
    kind: "bridge-closure",
    label: "Example closure",
  },
  vehicle: "truck",
  scenarioCaption: "Fictional route. Schematic map.",
  showRouteLabels: false,
};
/** Maximum density with full accepted display text. */
export const DENSE_INPUT: Input = {
  locations: {
    depotLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
    destinationLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
    junctionLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
  },
  routes: [
    {
      id: "direct",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      role: "blocked",
      points: [
        { x: 0.1, y: 0.5 },
        { x: 0.35, y: 0.5 },
        { x: 0.55, y: 0.5 },
        { x: 0.7, y: 0.5 },
        { x: 0.8, y: 0.5 },
        { x: 0.9, y: 0.5 },
      ],
    },
    {
      id: "alternative",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      role: "detour",
      points: [
        { x: 0.1, y: 0.5 },
        { x: 0.35, y: 0.5 },
        { x: 0.4, y: 0.1 },
        { x: 0.65, y: 0.1 },
        { x: 0.8, y: 0.3 },
        { x: 0.9, y: 0.5 },
      ],
    },
  ],
  obstruction: {
    segmentIndex: 1,
    kind: "bridge-closure",
    label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  vehicle: "truck",
  scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  showRouteLabels: true,
};
/** Default, minimal, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: changedInput },
  {
    id: "last-allowed-segment",
    input: {
      ...DENSE_INPUT,
      obstruction: { ...DENSE_INPUT.obstruction, segmentIndex: 4 },
    },
  },
  {
    id: "repeated-nonzero-waypoints",
    input: {
      ...DEFAULT_INPUT,
      routes: DEFAULT_INPUT.routes.map((route) => ({
        ...route,
        points: [
          route.points[0],
          route.points[1],
          route.points[1],
          ...route.points.slice(2),
        ],
      })),
      obstruction: { ...DEFAULT_INPUT.obstruction, segmentIndex: 2 },
    },
  },
  {
    id: "later-obstruction",
    input: {
      locations: {
        depotLabel: "Example depot",
        destinationLabel: "Willow reception",
        junctionLabel: "Route choice",
      },
      routes: [
        {
          id: "direct",
          label: "Original road",
          role: "blocked",
          points: [
            { x: 0.1, y: 0.5 },
            { x: 0.35, y: 0.5 },
            { x: 0.7, y: 0.5 },
            { x: 0.9, y: 0.5 },
          ],
        },
        {
          id: "alternative",
          label: "Agreed detour",
          role: "detour",
          points: [
            { x: 0.1, y: 0.5 },
            { x: 0.35, y: 0.5 },
            { x: 0.4, y: 0.25 },
            { x: 0.75, y: 0.25 },
            { x: 0.9, y: 0.5 },
          ],
        },
      ],
      obstruction: {
        segmentIndex: 2,
        kind: "barrier",
        label: "Example closure",
      },
      vehicle: "truck",
      scenarioCaption: "Fictional route. Schematic map.",
      showRouteLabels: true,
    },
  },
  {
    id: "stationary-closure",
    input: {
      locations: { depotLabel: "", destinationLabel: "", junctionLabel: "" },
      routes: [
        {
          id: "",
          label: "Original road",
          role: "blocked",
          points: [
            { x: 0.5, y: 0.5 },
            { x: 0.5, y: 0.5 },
            { x: 0.5, y: 0.5 },
            { x: 0.5, y: 0.5 },
          ],
        },
        {
          id: "",
          label: "Agreed detour",
          role: "detour",
          points: [
            { x: 0.5, y: 0.5 },
            { x: 0.5, y: 0.5 },
            { x: 0.5, y: 0.5 },
            { x: 0.5, y: 0.5 },
          ],
        },
      ],
      obstruction: {
        segmentIndex: 1,
        kind: "bridge-closure",
        label: "Example closure",
      },
      vehicle: "truck",
      scenarioCaption: "Fictional route. Schematic map.",
      showRouteLabels: false,
    },
  },
  {
    id: "prefix-crossing",
    input: {
      locations: {
        depotLabel: "Example depot",
        destinationLabel: "Willow reception",
        junctionLabel: "Route choice",
      },
      routes: [
        {
          id: "direct",
          label: "Original road",
          role: "blocked",
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.3, y: 0.2 },
            { x: 0.7, y: 0.8 },
            { x: 0.3, y: 0.7 },
            { x: 0.7, y: 0.3 },
            { x: 0.9, y: 0.8 },
          ],
        },
        {
          id: "alternative",
          label: "Agreed detour",
          role: "detour",
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.3, y: 0.2 },
            { x: 0.1, y: 0.9 },
            { x: 0.8, y: 0.9 },
            { x: 0.9, y: 0.8 },
          ],
        },
      ],
      obstruction: {
        segmentIndex: 3,
        kind: "bridge-closure",
        label: "Example closure",
      },
      vehicle: "truck",
      scenarioCaption: "Fictional route. Schematic map.",
      showRouteLabels: true,
    },
  },
];
