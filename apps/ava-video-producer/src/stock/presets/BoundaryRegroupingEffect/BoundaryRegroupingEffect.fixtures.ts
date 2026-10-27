import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./BoundaryRegroupingEffect.schema";
/** Complete fictional default, exactly as authored. */
export const DEFAULT_INPUT: Input = {
  cells: [
    {
      id: "nw",
      label: "Cell A",
      column: 0,
      row: 0,
      records: 3,
      population: 10,
    },
    {
      id: "ne",
      label: "Cell B",
      column: 1,
      row: 0,
      records: 1,
      population: 10,
    },
    {
      id: "sw",
      label: "Cell C",
      column: 0,
      row: 1,
      records: 0,
      population: 10,
    },
    {
      id: "se",
      label: "Cell D",
      column: 1,
      row: 1,
      records: 2,
      population: 10,
    },
  ],
  groupings: [
    {
      label: "West and east",
      zones: [
        {
          id: "w",
          label: "West",
          cellIds: ["nw", "sw"],
        },
        {
          id: "e",
          label: "East",
          cellIds: ["ne", "se"],
        },
      ],
    },
    {
      label: "North and south",
      zones: [
        {
          id: "n",
          label: "North",
          cellIds: ["nw", "ne"],
        },
        {
          id: "s",
          label: "South",
          cellIds: ["sw", "se"],
        },
      ],
    },
  ],
  measure: "normalized",
  rateBase: 100,
  copy: {
    context: "Fictional schematic boundary study",
    total: "Same overall total",
    records: "records",
    population: "residents",
    per: "per",
  },
  showCellValues: true,
};
/** Minimum collections including valid empty identifiers. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  cells: [
    {
      ...DEFAULT_INPUT["cells"][0],
      id: "",
      label: "",
      records: 0,
      population: 1,
    },
    { ...DEFAULT_INPUT["cells"][1], label: "", records: 0, population: 1 },
    { ...DEFAULT_INPUT["cells"][2], label: "", population: 1 },
    { ...DEFAULT_INPUT["cells"][3], label: "", records: 0, population: 1 },
  ],
  groupings: [
    {
      ...DEFAULT_INPUT["groupings"][0],
      label: "",
      zones: [
        {
          ...DEFAULT_INPUT["groupings"][0]["zones"][0],
          id: "",
          label: "",
          cellIds: [
            "",
            DEFAULT_INPUT["groupings"][0]["zones"][0]["cellIds"][1],
          ],
        },
        { ...DEFAULT_INPUT["groupings"][0]["zones"][1], label: "" },
      ],
    },
    {
      ...DEFAULT_INPUT["groupings"][1],
      label: "",
      zones: [
        {
          ...DEFAULT_INPUT["groupings"][1]["zones"][0],
          id: "",
          label: "",
          cellIds: [
            "",
            DEFAULT_INPUT["groupings"][1]["zones"][0]["cellIds"][1],
          ],
        },
        { ...DEFAULT_INPUT["groupings"][1]["zones"][1], label: "" },
      ],
    },
  ],
};
/** Maximum collections and accepted text bounds. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  cells: [
    {
      ...DEFAULT_INPUT["cells"][0],
      id: "0",
      label: "WWWWWWWWWWWWWWWW",
      records: 100,
      population: 1000,
    },
    {
      ...DEFAULT_INPUT["cells"][1],
      id: "1",
      label: "WWWWWWWWWWWWWWWW",
      records: 100,
      population: 1000,
    },
    {
      ...DEFAULT_INPUT["cells"][2],
      id: "2",
      label: "WWWWWWWWWWWWWWWW",
      column: 2,
      row: 0,
      records: 100,
      population: 1000,
    },
    {
      ...DEFAULT_INPUT["cells"][3],
      id: "3",
      label: "WWWWWWWWWWWWWWWW",
      column: 0,
      records: 100,
      population: 1000,
    },
    {
      id: "4",
      label: "WWWWWWWWWWWWWWWW",
      column: 1,
      row: 1,
      records: 100,
      population: 1000,
    },
    {
      id: "5",
      label: "WWWWWWWWWWWWWWWW",
      column: 2,
      row: 1,
      records: 100,
      population: 1000,
    },
    {
      id: "6",
      label: "WWWWWWWWWWWWWWWW",
      column: 0,
      row: 2,
      records: 100,
      population: 1000,
    },
    {
      id: "7",
      label: "WWWWWWWWWWWWWWWW",
      column: 1,
      row: 2,
      records: 100,
      population: 1000,
    },
    {
      id: "8",
      label: "WWWWWWWWWWWWWWWW",
      column: 2,
      row: 2,
      records: 100,
      population: 1000,
    },
  ],
  groupings: [
    {
      ...DEFAULT_INPUT["groupings"][0],
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      zones: [
        {
          ...DEFAULT_INPUT["groupings"][0]["zones"][0],
          id: "0",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          cellIds: ["0", "3", "6"],
        },
        {
          ...DEFAULT_INPUT["groupings"][0]["zones"][1],
          id: "1",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          cellIds: ["1", "4", "7"],
        },
        {
          id: "2",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          cellIds: ["2", "5", "8"],
        },
      ],
    },
    {
      ...DEFAULT_INPUT["groupings"][1],
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      zones: [
        {
          ...DEFAULT_INPUT["groupings"][1]["zones"][0],
          id: "0",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          cellIds: ["0", "1", "2"],
        },
        {
          ...DEFAULT_INPUT["groupings"][1]["zones"][1],
          id: "1",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          cellIds: ["3", "4", "5"],
        },
        {
          id: "2",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          cellIds: ["6", "7", "8"],
        },
      ],
    },
  ],
  copy: {
    ...DEFAULT_INPUT["copy"],
    context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    total: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    records: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    population: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    per: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
};
/** Changed authored quantities or optional presentation. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  cells: [
    { ...DEFAULT_INPUT["cells"][0], records: 7, population: 25 },
    { ...DEFAULT_INPUT["cells"][1], records: 0, population: 1 },
    { ...DEFAULT_INPUT["cells"][2], population: 1 },
    { ...DEFAULT_INPUT["cells"][3], records: 0, population: 1 },
  ],
  measure: "count",
  showCellValues: false,
};
/** Spaces and Unicode remain valid authored identifiers and references. */
const unicodeInput: Input = {
  ...DEFAULT_INPUT,
  cells: [
    { ...DEFAULT_INPUT["cells"][0], id: " α nw" },
    { ...DEFAULT_INPUT["cells"][1], id: " α ne" },
    { ...DEFAULT_INPUT["cells"][2], id: " α sw" },
    { ...DEFAULT_INPUT["cells"][3], id: " α se" },
  ],
  groupings: [
    {
      ...DEFAULT_INPUT["groupings"][0],
      zones: [
        {
          ...DEFAULT_INPUT["groupings"][0]["zones"][0],
          id: " α w",
          cellIds: [" α nw", " α sw"],
        },
        {
          ...DEFAULT_INPUT["groupings"][0]["zones"][1],
          id: " α e",
          cellIds: [" α ne", " α se"],
        },
      ],
    },
    {
      ...DEFAULT_INPUT["groupings"][1],
      zones: [
        {
          ...DEFAULT_INPUT["groupings"][1]["zones"][0],
          id: " α n",
          cellIds: [" α nw", " α ne"],
        },
        {
          ...DEFAULT_INPUT["groupings"][1]["zones"][1],
          id: " α s",
          cellIds: [" α sw", " α se"],
        },
      ],
    },
  ],
};
/** Incomplete documents, extra keys and invalid semantic relationships. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  {
    ...DEFAULT_INPUT,
    cells: [
      { ...DEFAULT_INPUT["cells"][0], records: 11 },
      DEFAULT_INPUT["cells"][1],
      DEFAULT_INPUT["cells"][2],
      DEFAULT_INPUT["cells"][3],
    ],
  },
  { ...DEFAULT_INPUT, groupings: [DEFAULT_INPUT["groupings"][0]] },
  {
    ...DEFAULT_INPUT,
    groupings: [
      {
        ...DEFAULT_INPUT["groupings"][0],
        zones: [
          {
            ...DEFAULT_INPUT["groupings"][0]["zones"][0],
            cellIds: ["missing"],
          },
          DEFAULT_INPUT["groupings"][0]["zones"][1],
        ],
      },
      DEFAULT_INPUT["groupings"][1],
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
