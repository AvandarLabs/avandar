import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./LocationUncertaintyBoundary.schema";
/** Complete fictional default, exactly as authored. */
export const DEFAULT_INPUT: Input = {
  districts: [
    {
      id: "w",
      label: "Demo West",
      polygon: [
        [0, 0],
        [50, 0],
        [50, 100],
        [0, 100],
      ],
    },
    {
      id: "e",
      label: "Demo East",
      polygon: [
        [50, 0],
        [100, 0],
        [100, 100],
        [50, 100],
      ],
    },
  ],
  locations: [
    {
      id: "a",
      label: "Record A",
      x: 25,
      y: 35,
      radius: 3,
    },
    {
      id: "b",
      label: "Record B",
      x: 48,
      y: 55,
      radius: 8,
    },
    {
      id: "c",
      label: "Record C",
      x: 75,
      y: 65,
      radius: 4,
    },
  ],
  focusedLocationId: "b",
  copy: {
    context: "Fictional schematic location bounds",
    nominal: "Nominal pin",
    possible: "Possible districts",
    definite: "Wholly inside one district",
    unresolved: "Assignment unresolved",
    total: "All supplied records",
    unit: "records",
  },
  showOtherFootprints: true,
};
/** Minimum collections including valid empty identifiers. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  districts: [
    { ...DEFAULT_INPUT["districts"][0], id: "" },
    DEFAULT_INPUT["districts"][1],
  ],
  locations: [
    { ...DEFAULT_INPUT["locations"][0], id: "", label: "", radius: 0 },
    { ...DEFAULT_INPUT["locations"][1], x: 50, radius: 0 },
  ],
  focusedLocationId: "",
};
/** Maximum collections and accepted text bounds. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  districts: [
    {
      ...DEFAULT_INPUT["districts"][0],
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      polygon: [
        DEFAULT_INPUT["districts"][0]["polygon"][0],
        [25, DEFAULT_INPUT["districts"][0]["polygon"][1][1]],
        [25, DEFAULT_INPUT["districts"][0]["polygon"][2][1]],
        DEFAULT_INPUT["districts"][0]["polygon"][3],
      ],
    },
    {
      ...DEFAULT_INPUT["districts"][1],
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      polygon: [
        [25, DEFAULT_INPUT["districts"][1]["polygon"][0][1]],
        [50, DEFAULT_INPUT["districts"][1]["polygon"][1][1]],
        [50, DEFAULT_INPUT["districts"][1]["polygon"][2][1]],
        [25, DEFAULT_INPUT["districts"][1]["polygon"][3][1]],
      ],
    },
    {
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      polygon: [
        [50, 0],
        [75, 0],
        [75, 100],
        [50, 100],
      ],
    },
    {
      id: "3",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      polygon: [
        [75, 0],
        [100, 0],
        [100, 100],
        [75, 100],
      ],
    },
  ],
  locations: [
    {
      ...DEFAULT_INPUT["locations"][0],
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWW",
      x: 15,
      y: 20,
      radius: 10,
    },
    {
      ...DEFAULT_INPUT["locations"][1],
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWW",
      x: 29,
      y: 30,
      radius: 10,
    },
    {
      ...DEFAULT_INPUT["locations"][2],
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWW",
      x: 43,
      y: 40,
      radius: 10,
    },
    { id: "3", label: "WWWWWWWWWWWWWWWWWWWW", x: 57, y: 50, radius: 10 },
    { id: "4", label: "WWWWWWWWWWWWWWWWWWWW", x: 71, y: 60, radius: 10 },
    { id: "5", label: "WWWWWWWWWWWWWWWWWWWW", x: 85, y: 70, radius: 10 },
  ],
  focusedLocationId: "2",
  copy: {
    ...DEFAULT_INPUT["copy"],
    context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    nominal: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    possible: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    definite: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unresolved: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    total: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
};
/** Changed authored quantities or optional presentation. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  locations: [
    { ...DEFAULT_INPUT["locations"][0], radius: 0 },
    { ...DEFAULT_INPUT["locations"][1], radius: 0 },
    { ...DEFAULT_INPUT["locations"][2], radius: 0 },
  ],
  focusedLocationId: "a",
  showOtherFootprints: false,
};
/** Spaces and Unicode remain valid authored identifiers and references. */
const unicodeInput: Input = {
  ...DEFAULT_INPUT,
  districts: [
    { ...DEFAULT_INPUT["districts"][0], id: " α w" },
    { ...DEFAULT_INPUT["districts"][1], id: " α e" },
  ],
  locations: [
    { ...DEFAULT_INPUT["locations"][0], id: " α a" },
    { ...DEFAULT_INPUT["locations"][1], id: " α b" },
    { ...DEFAULT_INPUT["locations"][2], id: " α c" },
  ],
  focusedLocationId: " α b",
};
/** Incomplete documents, extra keys and invalid semantic relationships. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, focusedLocationId: "missing" },
  {
    ...DEFAULT_INPUT,
    locations: [
      { ...DEFAULT_INPUT["locations"][0], x: 0 },
      DEFAULT_INPUT["locations"][1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    districts: [
      DEFAULT_INPUT["districts"][0],
      {
        ...DEFAULT_INPUT["districts"][1],
        id: "other",
        label: "Demo West",
        polygon: [
          [0, DEFAULT_INPUT["districts"][1]["polygon"][0][1]],
          [50, DEFAULT_INPUT["districts"][1]["polygon"][1][1]],
          [50, DEFAULT_INPUT["districts"][1]["polygon"][2][1]],
          [0, DEFAULT_INPUT["districts"][1]["polygon"][3][1]],
        ],
      },
    ],
  },
];
/** Deterministic collection, text, quantity and identity cases. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "unicode", input: unicodeInput },
];
