import type { Input } from "./HouseholdMarketChoice.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  products: [
    {
      id: "grain",
      label: "Example grain",
      symbol: "grain",
      price: 2,
      chosen: true,
    },
    {
      id: "beans",
      label: "Example beans",
      symbol: "beans",
      price: 3,
      chosen: true,
    },
    {
      id: "vegetables",
      label: "Example vegetables",
      symbol: "vegetables",
      price: 2,
      chosen: false,
    },
  ],
  availableCredits: 8,
  tender: "voucher",
  labels: {
    shopper: "Example household",
    retailer: "Example market",
    unit: "Demo credits",
    total: "Basket total",
    remaining: "Kept for later",
    tender: "Example voucher",
  },
  showRemainingBalance: true,
  scenarioCaption: "Fictional choice and prices",
};
/** Changed author input used by the behavioral test. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  tender: "cash",
  labels: { ...DEFAULT_INPUT.labels, tender: "Example cash" },
  availableCredits: 5,
};
/** Rejected incomplete, unknown and invalid authored inputs. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, unexpected: true },
  {},
  { ...DEFAULT_INPUT, availableCredits: 1 },
];

/** Smallest accepted collection example, including literal empty IDs. */
export const MINIMUM_INPUT: Input = {
  products: [
    { id: "", label: "", symbol: "grain", price: 1, chosen: true },
    { id: "路 2", label: "", symbol: "soap", price: 9, chosen: false },
  ],
  availableCredits: 1,
  tender: "voucher",
  labels: {
    shopper: "Example household",
    retailer: "Example market",
    unit: "Demo credits",
    total: "Basket total",
    remaining: "Kept for later",
    tender: "Example voucher",
  },
  showRemainingBalance: false,
  scenarioCaption: "Fictional choice and prices",
};
/** Maximum density with full accepted display text. */
export const DENSE_INPUT: Input = {
  products: [
    {
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "grain",
      price: 9,
      chosen: true,
    },
    {
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "beans",
      price: 9,
      chosen: true,
    },
    {
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "vegetables",
      price: 9,
      chosen: true,
    },
    {
      id: "3",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "soap",
      price: 9,
      chosen: false,
    },
    {
      id: "4",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "grain",
      price: 9,
      chosen: false,
    },
  ],
  availableCredits: 30,
  tender: "voucher",
  labels: {
    shopper: "WWWWWWWWWWWWWWWWWWWWWWWW",
    retailer: "WWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWWWWWWWWWWWWWWWWWW",
    total: "WWWWWWWWWWWWWWWWWWWWWWWW",
    remaining: "WWWWWWWWWWWWWWWWWWWWWWWW",
    tender: "WWWWWWWWWWWWWWWWWWWWWWWW",
  },
  showRemainingBalance: true,
  scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
};
/** Default, minimal, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: changedInput },
  {
    id: "rightmost-selections",
    input: {
      ...DENSE_INPUT,
      products: DENSE_INPUT.products.map((product, index) => ({
        ...product,
        chosen: index >= 2,
      })),
    },
  },
  {
    id: "exact-spend-cash",
    input: {
      products: [
        {
          id: "0",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "grain",
          price: 9,
          chosen: true,
        },
        {
          id: "1",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "beans",
          price: 9,
          chosen: true,
        },
        {
          id: "2",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "vegetables",
          price: 9,
          chosen: true,
        },
        {
          id: "3",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "soap",
          price: 9,
          chosen: false,
        },
        {
          id: "4",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          symbol: "grain",
          price: 9,
          chosen: false,
        },
      ],
      availableCredits: 27,
      tender: "cash",
      labels: {
        shopper: "WWWWWWWWWWWWWWWWWWWWWWWW",
        retailer: "WWWWWWWWWWWWWWWWWWWWWWWW",
        unit: "WWWWWWWWWWWWWWWWWWWWWWWW",
        total: "WWWWWWWWWWWWWWWWWWWWWWWW",
        remaining: "WWWWWWWWWWWWWWWWWWWWWWWW",
        tender: "Example cash",
      },
      showRemainingBalance: true,
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
];
