import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
/** Complete fictional default, exactly as authored. */
export const DEFAULT_INPUT: Input = {
  floorTiles: [
    {
      id: "a",
      column: 0,
      row: 0,
      role: "sleeping",
    },
    {
      id: "b",
      column: 1,
      row: 0,
      role: "sleeping",
    },
    {
      id: "c",
      column: 2,
      row: 0,
      role: "storage",
    },
    {
      id: "d",
      column: 0,
      row: 1,
      role: "sleeping",
    },
    {
      id: "e",
      column: 1,
      row: 1,
      role: "circulation",
    },
    {
      id: "f",
      column: 2,
      row: 1,
      role: "closed",
    },
  ],
  areaPerTile: 4,
  illustrativeAreaPerPlace: 2,
  registeredPeople: 8,
  copy: {
    context: "Fictional area-only example, not a standard",
    sleeping: "Sleeping area",
    circulation: "Circulation",
    storage: "Storage",
    closed: "Closed space",
    gross: "Gross floor area",
    usable: "Usable sleeping area",
    benchmark: "Illustrative area per place",
    capacity: "Area-only place equivalents",
    demand: "Registered people",
    shortfall: "People beyond equivalents",
    spare: "Spare place equivalents",
    areaUnit: "square metres",
  },
  keepGrossOutline: true,
};
/** Minimum collections including valid empty identifiers. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  floorTiles: [
    { ...DEFAULT_INPUT["floorTiles"][0], id: "", role: "closed" },
    { ...DEFAULT_INPUT["floorTiles"][1], role: "closed" },
    { ...DEFAULT_INPUT["floorTiles"][2], role: "closed" },
    { ...DEFAULT_INPUT["floorTiles"][3], role: "closed" },
  ],
  registeredPeople: 0,
};
/** Maximum collections and accepted text bounds. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  floorTiles: [
    { ...DEFAULT_INPUT["floorTiles"][0], id: "0" },
    { ...DEFAULT_INPUT["floorTiles"][1], id: "1", role: "circulation" },
    { ...DEFAULT_INPUT["floorTiles"][2], id: "2" },
    {
      ...DEFAULT_INPUT["floorTiles"][3],
      id: "3",
      column: 3,
      row: 0,
      role: "closed",
    },
    { ...DEFAULT_INPUT["floorTiles"][4], id: "4", column: 0, role: "sleeping" },
    {
      ...DEFAULT_INPUT["floorTiles"][5],
      id: "5",
      column: 1,
      role: "circulation",
    },
    { id: "6", column: 2, row: 1, role: "storage" },
    { id: "7", column: 3, row: 1, role: "closed" },
    { id: "8", column: 0, row: 2, role: "sleeping" },
    { id: "9", column: 1, row: 2, role: "circulation" },
    { id: "10", column: 2, row: 2, role: "storage" },
    { id: "11", column: 3, row: 2, role: "closed" },
  ],
  areaPerTile: 20,
  illustrativeAreaPerPlace: 0.5,
  registeredPeople: 40,
  copy: {
    ...DEFAULT_INPUT["copy"],
    context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    sleeping: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    circulation: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    storage: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    closed: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    gross: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    usable: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    benchmark: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    capacity: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    demand: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    shortfall: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    spare: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    areaUnit: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
};
/** Changed authored quantities or optional presentation. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  areaPerTile: 8.03,
  illustrativeAreaPerPlace: 0.73,
  keepGrossOutline: false,
};
/** Spaces and Unicode remain valid authored identifiers and references. */
const unicodeInput: Input = {
  ...DEFAULT_INPUT,
  floorTiles: [
    { ...DEFAULT_INPUT["floorTiles"][0], id: " α a" },
    { ...DEFAULT_INPUT["floorTiles"][1], id: " α b" },
    { ...DEFAULT_INPUT["floorTiles"][2], id: " α c" },
    { ...DEFAULT_INPUT["floorTiles"][3], id: " α d" },
    { ...DEFAULT_INPUT["floorTiles"][4], id: " α e" },
    { ...DEFAULT_INPUT["floorTiles"][5], id: " α f" },
  ],
};
/** Incomplete documents, extra keys and invalid semantic relationships. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, areaPerTile: 1.001 },
  { ...DEFAULT_INPUT, illustrativeAreaPerPlace: 0.501 },
  {
    ...DEFAULT_INPUT,
    floorTiles: [
      DEFAULT_INPUT["floorTiles"][0],
      { ...DEFAULT_INPUT["floorTiles"][1], column: 0 },
      { ...DEFAULT_INPUT["floorTiles"][2], column: 0 },
      { ...DEFAULT_INPUT["floorTiles"][3], row: 0 },
      { ...DEFAULT_INPUT["floorTiles"][4], column: 0, row: 0 },
      { ...DEFAULT_INPUT["floorTiles"][5], column: 0, row: 0 },
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
