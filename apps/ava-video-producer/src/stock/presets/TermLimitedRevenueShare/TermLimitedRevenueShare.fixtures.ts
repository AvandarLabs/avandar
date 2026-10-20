import type { Input } from "./TermLimitedRevenueShare.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  periods: [
    {
      id: "period-a",
      label: "Demo period A",
      receiptsMinor: 10000,
      operatingOutflowMinor: 6000,
      distributionActive: true,
    },
    {
      id: "period-b",
      label: "Demo period B",
      receiptsMinor: 10000,
      operatingOutflowMinor: 6000,
      distributionActive: false,
    },
  ],
  arrangement: {
    label: "Demo temporary distribution",
    rateBasisPoints: 1000,
    termBoundaryLabel: "Authored term ends",
  },
  money: {
    unitLabel: "demo credits",
    minorUnitsPerUnit: 100,
  },
  copy: {
    receipts: "Period receipts",
    operating: "Operating outflow",
    distribution: "Temporary distribution",
    retained: "Retained period cash",
    example: "Fictional arithmetic; no financial forecast",
  },
  showAmounts: true,
  arrangementLayout: "side-by-side",
};
/** Minimum, dense and changed authored cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      periods: [
        {
          ...DEFAULT_INPUT.periods[0],
          receiptsMinor: 1,
          operatingOutflowMinor: 0,
        },
        {
          ...DEFAULT_INPUT.periods[1],
          receiptsMinor: 1,
          operatingOutflowMinor: 0,
        },
      ],
      arrangement: { ...DEFAULT_INPUT.arrangement, rateBasisPoints: 10000 },
      money: { ...DEFAULT_INPUT.money, minorUnitsPerUnit: 1 },
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      periods: [
        {
          ...DEFAULT_INPUT.periods[0],
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          receiptsMinor: 1000000,
          operatingOutflowMinor: 0,
        },
        {
          ...DEFAULT_INPUT.periods[1],
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          receiptsMinor: 1000000,
          operatingOutflowMinor: 0,
        },
      ],
      arrangement: {
        ...DEFAULT_INPUT.arrangement,
        label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        rateBasisPoints: 10000,
        termBoundaryLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      money: { ...DEFAULT_INPUT.money, unitLabel: "WWWWWWWWWWWWWWWWWW" },
      copy: {
        ...DEFAULT_INPUT.copy,
        receipts: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        operating: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        distribution: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        retained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      showAmounts: false,
      arrangementLayout: "stacked",
    },
  },
];
/** Rejected complete and malformed documents. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, periods: [] },
  {
    ...DEFAULT_INPUT,
    periods: [
      { ...DEFAULT_INPUT.periods[0], receiptsMinor: 9999 },
      { ...DEFAULT_INPUT.periods[1], receiptsMinor: 9999 },
    ],
  },
  {
    ...DEFAULT_INPUT,
    arrangement: { ...DEFAULT_INPUT.arrangement, rateBasisPoints: 5000 },
  },
  {
    ...DEFAULT_INPUT,
    periods: [
      {
        ...DEFAULT_INPUT.periods[0],
        id: "period-b",
        label: "Demo period B",
        distributionActive: false,
      },
      {
        ...DEFAULT_INPUT.periods[1],
        id: "period-a",
        label: "Demo period A",
        distributionActive: true,
      },
    ],
  },
];
