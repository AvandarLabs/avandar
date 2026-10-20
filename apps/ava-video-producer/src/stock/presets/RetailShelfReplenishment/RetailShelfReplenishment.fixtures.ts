import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./RetailShelfReplenishment.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  goods: [
    {
      id: "grain",
      label: "Example grain",
      symbol: "grain",
      openingUnits: 1,
      incomingUnits: 2,
      selectedUnits: 1,
    },
    {
      id: "beans",
      label: "Example beans",
      symbol: "beans",
      openingUnits: 0,
      incomingUnits: 2,
      selectedUnits: 1,
    },
  ],
  labels: {
    retailer: "Example retailer",
    shopper: "Example shopper",
    order: "Restock request",
    delivery: "Example replenishment",
    unit: "Illustrative items",
  },
  deliveryMode: "handcart",
  showQuantityLabels: true,
  showOrderSlip: true,
  scenarioCaption: "Fictional shop and quantities",
};
/** Smallest accepted example, including literal empty identifiers. */
export const MINIMUM_INPUT: Input = {
  goods: [
    {
      id: "",
      label: "",
      symbol: "grain",
      openingUnits: 0,
      incomingUnits: 1,
      selectedUnits: 1,
    },
  ],
  labels: {
    retailer: "Example retailer",
    shopper: "Example shopper",
    order: "Restock request",
    delivery: "Example replenishment",
    unit: "Illustrative items",
  },
  deliveryMode: "handcart",
  showQuantityLabels: true,
  showOrderSlip: true,
  scenarioCaption: "Fictional shop and quantities",
};
/** Maximum collection density and accepted display lengths. */
export const DENSE_INPUT: Input = {
  goods: [
    {
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "grain",
      openingUnits: 2,
      incomingUnits: 2,
      selectedUnits: 1,
    },
    {
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "beans",
      openingUnits: 2,
      incomingUnits: 2,
      selectedUnits: 1,
    },
    {
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "vegetables",
      openingUnits: 2,
      incomingUnits: 2,
      selectedUnits: 1,
    },
  ],
  labels: {
    retailer: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    shopper: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    order: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    delivery: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  deliveryMode: "handcart",
  showQuantityLabels: true,
  showOrderSlip: true,
  scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
};
/** Changed authored choices, quantities and optional presentation. */
export const CHANGED_INPUT: Input = {
  goods: [
    {
      id: "路 1",
      label: "Chosen vegetables",
      symbol: "vegetables",
      openingUnits: 0,
      incomingUnits: 3,
      selectedUnits: 3,
    },
  ],
  labels: {
    retailer: "Example retailer",
    shopper: "Example shopper",
    order: "Restock request",
    delivery: "Example replenishment",
    unit: "Illustrative items",
  },
  deliveryMode: "cargo-bike",
  showQuantityLabels: false,
  showOrderSlip: false,
  scenarioCaption: "Fictional shop and quantities",
};
/** Invalid complete documents and malformed collections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, goods: [] },
  {
    ...DEFAULT_INPUT,
    goods: [{ ...DEFAULT_INPUT.goods[0], selectedUnits: 4 }],
  },
  {
    ...DEFAULT_INPUT,
    goods: [{ ...DEFAULT_INPUT.goods[0], openingUnits: 2, incomingUnits: 4 }],
  },
  {
    ...DEFAULT_INPUT,
    goods: [{ ...DEFAULT_INPUT.goods[0], incomingUnits: 0, selectedUnits: 0 }],
  },
  { ...DEFAULT_INPUT, goods: [DEFAULT_INPUT.goods[0], DEFAULT_INPUT.goods[0]] },
  {
    ...DEFAULT_INPUT,
    goods: [{ ...DEFAULT_INPUT.goods[0], selectedUnits: 1.5 }],
  },
  {
    ...DENSE_INPUT,
    goods: DENSE_INPUT.goods.map((good, index) => ({
      ...good,
      openingUnits: index === 0 ? 4 : 3,
      incomingUnits: 1,
    })),
  },
  {
    ...DEFAULT_INPUT,
    goods: DEFAULT_INPUT.goods.map((good, index) => ({
      ...good,
      openingUnits: 0,
      incomingUnits: index === 0 ? 3 : 4,
    })),
  },
  {
    ...DEFAULT_INPUT,
    goods: DEFAULT_INPUT.goods.map((good) => ({ ...good, selectedUnits: 2 })),
  },
  {
    ...DEFAULT_INPUT,
    goods: [
      { ...DEFAULT_INPUT.goods[0], extra: true },
      ...DEFAULT_INPUT.goods.slice(1),
    ],
  },
];

/** Concentrated incoming and selected quantities with twelve physical units. */
export const concentratedInput: Input = {
  ...DENSE_INPUT,
  goods: DENSE_INPUT.goods.map((good, index) => ({
    ...good,
    openingUnits: [1, 3, 2][index],
    incomingUnits: [4, 2, 0][index],
    selectedUnits: index === 0 ? 3 : 0,
  })),
};

/** Stable complete accepted examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
  { id: "concentrated", input: concentratedInput },
];
