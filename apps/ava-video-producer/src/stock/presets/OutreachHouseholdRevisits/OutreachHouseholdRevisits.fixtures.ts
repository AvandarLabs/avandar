import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./OutreachHouseholdRevisits.schema";
/** Complete fictional authored defaults. */
export const DEFAULT_INPUT: Input = {
  households: [
    {
      id: "h1",
      label: "Home A",
      x: 0.12,
      y: 0.24,
    },
    {
      id: "h2",
      label: "Home B",
      x: 0.4,
      y: 0.2,
    },
    {
      id: "h3",
      label: "Home C",
      x: 0.75,
      y: 0.23,
    },
    {
      id: "h4",
      label: "Home D",
      x: 0.18,
      y: 0.72,
    },
    {
      id: "h5",
      label: "Home E",
      x: 0.51,
      y: 0.7,
    },
    {
      id: "h6",
      label: "Home F",
      x: 0.82,
      y: 0.7,
    },
  ],
  visits: [
    {
      householdId: "h1",
      contacted: true,
    },
    {
      householdId: "h2",
      contacted: false,
    },
    {
      householdId: "h3",
      contacted: true,
    },
    {
      householdId: "h2",
      contacted: true,
    },
    {
      householdId: "h4",
      contacted: false,
    },
  ],
  sceneLabel: "Fictional example",
  showVisitStamps: true,
  showUniqueLedger: true,
  copy: {
    map: "Schematic neighborhood",
    visits: "Visit events",
    visited: "Unique households visited",
    contacted: "Unique households contacted",
    noContact: "Visited, no contact",
    unvisited: "Unvisited",
    denominator: "Households in example",
  },
};

const minimumInput: Input = {
  ...DEFAULT_INPUT,
  households: [
    { id: "", label: "", x: 0.1, y: 0.1 },
    { id: "空 one", label: "", x: 0.5, y: 0.1 },
    { id: "other", label: "", x: 0.9, y: 0.1 },
  ],
  visits: [{ householdId: "", contacted: false }],
};
const denseInput: Input = {
  ...DEFAULT_INPUT,
  households: Array.from({ length: 8 }, (_, index) => ({
    id: `home ${index}`,
    label: "W".repeat(16),
    x: 0.1 + (index % 4) * 0.24,
    y: index < 4 ? 0.1 : 0.9,
  })),
  visits: Array.from({ length: 8 }, (_, index) => ({
    householdId: `home ${Math.floor(index / 3)}`,
    contacted: index % 3 === 1,
  })),
  sceneLabel: "W".repeat(40),
  copy: {
    map: "W".repeat(42),
    visits: "W".repeat(42),
    visited: "W".repeat(42),
    contacted: "W".repeat(42),
    noContact: "W".repeat(42),
    unvisited: "W".repeat(42),
    denominator: "W".repeat(42),
  },
};
/**
 * Failed contact, contact, then failed contact retain one unique reached home.
 */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  visits: [
    { householdId: "h1", contacted: false },
    { householdId: "h1", contacted: true },
    { householdId: "h1", contacted: false },
  ],
};
const toggledInput: Input = {
  ...denseInput,
  showVisitStamps: false,
  showUniqueLedger: false,
};
/** Missing references, impossible placement and repeated-event bounds. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, visits: [] },
  { ...DEFAULT_INPUT, visits: [{ householdId: "missing", contacted: true }] },
  {
    ...DEFAULT_INPUT,
    visits: Array.from({ length: 4 }, () => ({
      householdId: "h1",
      contacted: false,
    })),
  },
  {
    ...DEFAULT_INPUT,
    households: [
      DEFAULT_INPUT.households[0],
      DEFAULT_INPUT.households[0],
      DEFAULT_INPUT.households[2],
    ],
  },
  {
    ...DEFAULT_INPUT,
    households: DEFAULT_INPUT.households.map((household) => ({
      ...household,
      x: 0.1,
      y: 0.1,
    })),
  },
  {
    ...DEFAULT_INPUT,
    households: DEFAULT_INPUT.households.map((household) => ({
      ...household,
      x: 0,
    })),
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: "invalid" } },
];
/** Default, minimum, dense, changed and toggled complete examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "toggled", input: toggledInput },
];
