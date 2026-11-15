import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./GisLayerIntersectionTally.schema";
/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  layers: [
    {
      id: "a",
      label: "Demo exposure zone",
      polygon: [
        [10, 10],
        [65, 10],
        [65, 80],
        [10, 80],
      ],
    },
    {
      id: "b",
      label: "Demo planning zone",
      polygon: [
        [40, 25],
        [90, 25],
        [90, 90],
        [40, 90],
      ],
    },
  ],
  households: [
    { id: "h1", label: "Home A", x: 20, y: 30, members: 2 },
    { id: "h2", label: "Home B", x: 50, y: 40, members: 3 },
    { id: "h3", label: "Home C", x: 80, y: 60, members: 1 },
    { id: "h4", label: "Home D", x: 20, y: 90, members: 2 },
  ],
  operation: "intersection",
  measure: "members",
  copy: {
    context: "Fictional schematic geography",
    intersection: "Inside both layers",
    difference: "Inside first layer only",
    selected: "Selected",
    total: "All supplied",
    households: "households",
    members: "people",
  },
  showLayerOutlines: true,
};
/** Minimum collections and accepted edge values. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  layers: [
    {
      id: "",
      label: "",
      polygon: [
        [0, 0],
        [100, 0],
        [0, 100],
      ],
    },
    {
      id: "b",
      label: "Demo planning zone",
      polygon: [
        [10, 10],
        [90, 10],
        [90, 90],
      ],
    },
  ],
  households: [
    { id: "", label: "", x: 20, y: 30, members: 1 },
    { id: "h2", label: "Home B", x: 50, y: 40, members: 1 },
  ],
};
/** Maximum collections and accepted visible text. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  layers: [
    {
      id: "a",
      label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      polygon: [
        [10, 10],
        [30, 10],
        [65, 10],
        [65, 45],
        [65, 80],
        [30, 80],
        [10, 80],
        [10, 45],
      ],
    },
    {
      id: "b",
      label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      polygon: [
        [40, 25],
        [65, 25],
        [90, 25],
        [90, 55],
        [90, 90],
        [65, 90],
        [40, 90],
        [40, 55],
      ],
    },
  ],
  households: [
    {
      id: "home 0",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 1",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 2",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 3",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 4",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 5",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 6",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 7",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 8",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 9",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 10",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
    {
      id: "home 11",
      label: "界界界界界界界界界界界界界界界界界界界界",
      x: 50,
      y: 40,
      members: 8,
    },
  ],
  copy: {
    ...DEFAULT_INPUT.copy,
    intersection:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    difference:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    selected:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    total:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    households:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    members:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
  },
};
/** Changed assignments and presentation toggles. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  operation: "first-minus-second",
  measure: "households",
  showLayerOutlines: false,
};
/** Accepted complete scene examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
];
/** Invalid structure, identities, references and arithmetic. */
export const invalidInputs: unknown[] = [
  {
    ...DEFAULT_INPUT,
    layers: [
      {
        id: "a",
        label: "Demo exposure zone",
        polygon: [
          [0, 0],
          [10, 10],
          [0, 10],
          [10, 0],
        ],
      },
      {
        id: "b",
        label: "Demo planning zone",
        polygon: [
          [40, 25],
          [90, 25],
          [90, 90],
          [40, 90],
        ],
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    households: [
      { id: "h1", label: "Home A", x: 10, y: 30, members: 2 },
      { id: "h2", label: "Home B", x: 50, y: 40, members: 3 },
      { id: "h3", label: "Home C", x: 80, y: 60, members: 1 },
      { id: "h4", label: "Home D", x: 20, y: 90, members: 2 },
    ],
  },
  {
    layers: [
      {
        id: "a",
        label: "Demo exposure zone",
        polygon: [
          [10, 10],
          [65, 10],
          [65, 80],
          [10, 80],
        ],
      },
      {
        id: "b",
        label: "Demo planning zone",
        polygon: [
          [40, 25],
          [90, 25],
          [90, 90],
          [40, 90],
        ],
      },
    ],
    households: [
      { id: "h1", label: "Home A", x: 20, y: 30, members: 2 },
      { id: "h2", label: "Home B", x: 50, y: 40, members: 3 },
      { id: "h3", label: "Home C", x: 80, y: 60, members: 1 },
      { id: "h4", label: "Home D", x: 20, y: 90, members: 2 },
    ],
    operation: "intersection",
    measure: "members",
    copy: {
      context: "Fictional schematic geography",
      intersection: "Inside both layers",
      difference: "Inside first layer only",
      selected: "Selected",
      total: "All supplied",
      households: "households",
      members: "people",
    },
    showLayerOutlines: true,
    extra: true,
  },
  {
    households: [
      { id: "h1", label: "Home A", x: 20, y: 30, members: 2 },
      { id: "h2", label: "Home B", x: 50, y: 40, members: 3 },
      { id: "h3", label: "Home C", x: 80, y: 60, members: 1 },
      { id: "h4", label: "Home D", x: 20, y: 90, members: 2 },
    ],
    operation: "intersection",
    measure: "members",
    copy: {
      context: "Fictional schematic geography",
      intersection: "Inside both layers",
      difference: "Inside first layer only",
      selected: "Selected",
      total: "All supplied",
      households: "households",
      members: "people",
    },
    showLayerOutlines: true,
  },
  {
    ...DEFAULT_INPUT,
    layers: [
      {
        id: "a",
        label: "Demo exposure zone",
        polygon: [
          [10, 10],
          [65, 10],
          [65, 80],
          [10, 80],
        ],
      },
      {
        id: "a",
        label: "Demo exposure zone",
        polygon: [
          [10, 10],
          [65, 10],
          [65, 80],
          [10, 80],
        ],
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    households: [
      { id: "h1", label: "Home A", x: 20, y: 30, members: 2 },
      { id: "h1", label: "Home A", x: 20, y: 30, members: 2 },
      { id: "h1", label: "Home A", x: 20, y: 30, members: 2 },
      { id: "h1", label: "Home A", x: 20, y: 30, members: 2 },
    ],
  },
];
