import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./EqualCountUnequalVolume.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  groups: [
    {
      id: "g-a",
      label: "Demo collection A",
      items: [
        {
          id: "a-1",
          label: "Item A1",
          bytes: 100,
        },
        {
          id: "a-2",
          label: "Item A2",
          bytes: 200,
        },
        {
          id: "a-3",
          label: "Item A3",
          bytes: 300,
        },
      ],
    },
    {
      id: "g-b",
      label: "Demo collection B",
      items: [
        {
          id: "b-1",
          label: "Item B1",
          bytes: 500,
        },
        {
          id: "b-2",
          label: "Item B2",
          bytes: 800,
        },
        {
          id: "b-3",
          label: "Item B3",
          bytes: 900,
        },
      ],
    },
  ],
  itemKind: "datasets",
  measure: {
    displayUnit: "B",
    basisLabel: "Illustrative stored bytes",
    scaleMaximumBytes: 2400,
  },
  copy: {
    count: "Item count",
    size: "Data size",
    total: "Collection total",
    proxyNote: "Count alone does not determine size",
    example: "Fictional byte quantities",
  },
  showItemSizes: true,
  showCountGuides: true,
};
/** Minimum collection sizes and accepted zero quantities. */
export const MINIMUM_INPUT: Input = {
  groups: [
    {
      id: " ",
      label: "Demo collection A",
      items: [
        {
          id: " ",
          label: "A",
          bytes: 0,
        },
      ],
    },
    {
      id: "界",
      label: "Demo collection B",
      items: [
        {
          id: "界",
          label: "B",
          bytes: 1,
        },
      ],
    },
  ],
  itemKind: "datasets",
  measure: {
    displayUnit: "B",
    basisLabel: "Illustrative stored bytes",
    scaleMaximumBytes: 1,
  },
  copy: {
    count: "Item count",
    size: "Data size",
    total: "Collection total",
    proxyNote: "Count alone does not determine size",
    example: "Fictional byte quantities",
  },
  showItemSizes: false,
  showCountGuides: false,
};
/** Maximum collection density and full display text bounds. */
export const DENSE_INPUT: Input = {
  groups: [
    {
      id: "g-aWWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      items: [
        {
          id: "a-0WWWWWWWWWWWWW",
          label: "WWWWWWWWWWWWWWWW",
          bytes: 10000000,
        },
        {
          id: "a-1WWWWWWWWWWWWW",
          label: "WWWWWWWWWWWWWWWW",
          bytes: 10000000,
        },
        {
          id: "a-2WWWWWWWWWWWWW",
          label: "WWWWWWWWWWWWWWWW",
          bytes: 10000000,
        },
      ],
    },
    {
      id: "g-bWWWWWWWWWWWWW",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      items: [
        {
          id: "b-0WWWWWWWWWWWWW",
          label: "WWWWWWWWWWWWWWWW",
          bytes: 0,
        },
        {
          id: "b-1WWWWWWWWWWWWW",
          label: "WWWWWWWWWWWWWWWW",
          bytes: 0,
        },
        {
          id: "b-2WWWWWWWWWWWWW",
          label: "WWWWWWWWWWWWWWWW",
          bytes: 0,
        },
      ],
    },
  ],
  itemKind: "datasets",
  measure: {
    displayUnit: "MiB",
    basisLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    scaleMaximumBytes: 60000000,
  },
  copy: {
    count: "WWWWWWWWWWWWWWWWWWWWWWWW",
    size: "WWWWWWWWWWWWWWWWWWWWWWWW",
    total: "WWWWWWWWWWWWWWWWWWWWWWWW",
    proxyNote: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  showItemSizes: true,
  showCountGuides: true,
};
/** Changed membership, choice, or measurement display. */
export const CHANGED_INPUT: Input = {
  groups: [
    {
      id: "g-a",
      label: "Demo collection A",
      items: [
        {
          id: "a-1",
          label: "Item A1",
          bytes: 0,
        },
        {
          id: "a-2",
          label: "Item A2",
          bytes: 200,
        },
        {
          id: "a-3",
          label: "Item A3",
          bytes: 300,
        },
      ],
    },
    {
      id: "g-b",
      label: "Demo collection B",
      items: [
        {
          id: "b-1",
          label: "Item B1",
          bytes: 500,
        },
        {
          id: "b-2",
          label: "Item B2",
          bytes: 800,
        },
        {
          id: "b-3",
          label: "Item B3",
          bytes: 900,
        },
      ],
    },
  ],
  itemKind: "rows",
  measure: {
    displayUnit: "KiB",
    basisLabel: "Illustrative stored bytes",
    scaleMaximumBytes: 2400,
  },
  copy: {
    count: "Item count",
    size: "Data size",
    total: "Collection total",
    proxyNote: "Count alone does not determine size",
    example: "Fictional byte quantities",
  },
  showItemSizes: false,
  showCountGuides: false,
};

/** Complete fixtures for deterministic rendering and text stress. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
];
