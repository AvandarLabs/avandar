import { inputSchema } from "./PopulationNormalizedMap.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete fictional defaults, validated at the content boundary. */
export const defaultInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    zones: [
      {
        id: "a",
        label: "Demo West",
        polygon: [
          [5, 10],
          [45, 10],
          [45, 90],
          [5, 90],
        ],
        records: 4,
        population: 40,
      },
      {
        id: "b",
        label: "Demo East",
        polygon: [
          [55, 10],
          [95, 10],
          [95, 90],
          [55, 90],
        ],
        records: 3,
        population: 10,
      },
    ],
    rateBase: 100,
    colorDomains: {
      countMaximum: 5,
      normalizedMaximum: 40,
    },
    periodLabel: "Fictional observation period",
    copy: {
      context: "Fictional schematic zone comparison",
      countLegend: "Supplied record count",
      normalizedLegend: "Records per population base",
      records: "records",
      population: "residents",
      per: "per",
    },
    keepFractionsVisible: true,
  });
/** A complete alternate behavior and toggle input. */
export const changedInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    zones: [
      {
        id: "a",
        label: "Demo West",
        polygon: [
          [5, 10],
          [45, 10],
          [45, 90],
          [5, 90],
        ],
        records: 4,
        population: 40,
      },
      {
        id: "b",
        label: "Demo East",
        polygon: [
          [55, 10],
          [95, 10],
          [95, 90],
          [55, 90],
        ],
        records: 4,
        population: 10,
      },
    ],
    rateBase: 100,
    colorDomains: {
      countMaximum: 5,
      normalizedMaximum: 40,
    },
    periodLabel: "Fictional observation period",
    copy: {
      context: "Fictional schematic zone comparison",
      countLegend: "Supplied record count",
      normalizedLegend: "Records per population base",
      records: "records",
      population: "residents",
      per: "per",
    },
    keepFractionsVisible: false,
  });
/** Default, minimum, dense and changed-input cases. */
export const fixtures: StockContract<typeof defaultInput>["fixtures"] = [
  { id: "default", input: defaultInput },
  {
    id: "minimum",
    input: inputSchema.parse({
      zones: [
        {
          id: "",
          label: "Demo West",
          polygon: [
            [5, 10],
            [45, 10],
            [45, 90],
            [5, 90],
          ],
          records: 0,
          population: 1,
        },
        {
          id: "区 space",
          label: "Demo East",
          polygon: [
            [55, 10],
            [95, 10],
            [95, 90],
            [55, 90],
          ],
          records: 0,
          population: 1,
        },
      ],
      rateBase: 1,
      colorDomains: {
        countMaximum: 5,
        normalizedMaximum: 40,
      },
      periodLabel: "x",
      copy: {
        context: "Fictional schematic zone comparison",
        countLegend: "Supplied record count",
        normalizedLegend: "Records per population base",
        records: "records",
        population: "residents",
        per: "per",
      },
      keepFractionsVisible: true,
    }),
  },
  {
    id: "dense",
    input: inputSchema.parse({
      zones: [
        {
          id: "0",
          label: "MMMMMMMMMMMMMMMMMMMMMMMM",
          polygon: [
            [0, 0],
            [25, 0],
            [25, 100],
            [0, 100],
          ],
          records: 100,
          population: 1000,
        },
        {
          id: "1",
          label: "MMMMMMMMMMMMMMMMMMMMMMMM",
          polygon: [
            [25, 0],
            [50, 0],
            [50, 100],
            [25, 100],
          ],
          records: 100,
          population: 1000,
        },
        {
          id: "2",
          label: "MMMMMMMMMMMMMMMMMMMMMMMM",
          polygon: [
            [50, 0],
            [75, 0],
            [75, 100],
            [50, 100],
          ],
          records: 100,
          population: 1000,
        },
        {
          id: "3",
          label: "MMMMMMMMMMMMMMMMMMMMMMMM",
          polygon: [
            [75, 0],
            [100, 0],
            [100, 100],
            [75, 100],
          ],
          records: 100,
          population: 1000,
        },
      ],
      rateBase: 100,
      colorDomains: {
        countMaximum: 100,
        normalizedMaximum: 100,
      },
      periodLabel: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        countLegend: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        normalizedLegend: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        records: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        population: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        per: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      keepFractionsVisible: true,
    }),
  },
  { id: "changed", input: changedInput },
];
/** Common structural rejection examples. */
export const invalidInputs: unknown[] = [
  {},
  { ...defaultInput, extra: true },
  { ...defaultInput, copy: { ...defaultInput.copy, context: "x".repeat(45) } },
  { ...defaultInput, zones: [] },
];
