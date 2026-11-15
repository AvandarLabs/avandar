import { inputSchema } from "./CatchmentUnionGaps.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete fictional defaults, validated at the content boundary. */
export const defaultInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    catchments: [
      {
        id: "west",
        label: "Service A footprint",
        polygon: [
          [5, 10],
          [60, 10],
          [60, 85],
          [5, 85],
        ],
      },
      {
        id: "east",
        label: "Service B footprint",
        polygon: [
          [40, 15],
          [85, 15],
          [85, 85],
          [40, 85],
        ],
      },
    ],
    households: [
      {
        id: "a",
        label: "Home A",
        x: 20,
        y: 30,
        members: 2,
      },
      {
        id: "b",
        label: "Home B",
        x: 50,
        y: 50,
        members: 3,
      },
      {
        id: "c",
        label: "Home C",
        x: 75,
        y: 60,
        members: 1,
      },
      {
        id: "d",
        label: "Home D",
        x: 92,
        y: 90,
        members: 2,
      },
    ],
    measure: "households",
    gapEmphasis: "outline",
    copy: {
      context: "Fictional schematic catchments",
      covered: "Inside at least one footprint",
      uncovered: "Outside every footprint",
      overlap: "Count each household once",
      total: "All supplied",
      households: "households",
      members: "people",
    },
    showOriginalOutlines: true,
  });
/** A complete alternate behavior and toggle input. */
export const changedInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    catchments: [
      {
        id: "west",
        label: "Service A footprint",
        polygon: [
          [5, 10],
          [60, 10],
          [60, 85],
          [5, 85],
        ],
      },
    ],
    households: [
      {
        id: "a",
        label: "Home A",
        x: 20,
        y: 30,
        members: 2,
      },
      {
        id: "b",
        label: "Home B",
        x: 50,
        y: 50,
        members: 3,
      },
      {
        id: "c",
        label: "Home C",
        x: 75,
        y: 60,
        members: 1,
      },
      {
        id: "d",
        label: "Home D",
        x: 92,
        y: 90,
        members: 2,
      },
    ],
    measure: "members",
    gapEmphasis: "hatch",
    copy: {
      context: "Fictional schematic catchments",
      covered: "Inside at least one footprint",
      uncovered: "Outside every footprint",
      overlap: "Count each household once",
      total: "All supplied",
      households: "households",
      members: "people",
    },
    showOriginalOutlines: false,
  });
/** Default, minimum, dense and changed-input cases. */
export const fixtures: StockContract<typeof defaultInput>["fixtures"] = [
  { id: "default", input: defaultInput },
  {
    id: "minimum",
    input: inputSchema.parse({
      catchments: [
        {
          id: "",
          label: "Service A footprint",
          polygon: [
            [5, 10],
            [60, 10],
            [60, 85],
            [5, 85],
          ],
        },
      ],
      households: [
        {
          id: "",
          label: "Home A",
          x: 20,
          y: 30,
          members: 2,
        },
        {
          id: "家 space",
          label: "Home B",
          x: 50,
          y: 50,
          members: 3,
        },
      ],
      measure: "households",
      gapEmphasis: "outline",
      copy: {
        context: "Fictional schematic catchments",
        covered: "Inside at least one footprint",
        uncovered: "Outside every footprint",
        overlap: "Count each household once",
        total: "All supplied",
        households: "households",
        members: "people",
      },
      showOriginalOutlines: true,
    }),
  },
  {
    id: "dense",
    input: inputSchema.parse({
      catchments: [
        {
          id: "0",
          label: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
          polygon: [
            [5, 10],
            [60, 10],
            [60, 85],
            [5, 85],
          ],
        },
        {
          id: "1",
          label: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
          polygon: [
            [40, 15],
            [85, 15],
            [85, 85],
            [40, 85],
          ],
        },
        {
          id: "2",
          label: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
          polygon: [
            [5, 10],
            [60, 10],
            [60, 85],
            [5, 85],
          ],
        },
        {
          id: "3",
          label: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
          polygon: [
            [40, 15],
            [85, 15],
            [85, 85],
            [40, 85],
          ],
        },
      ],
      households: [
        {
          id: "0",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "1",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "2",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "3",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "4",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "5",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "6",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "7",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "8",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "9",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "10",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
        {
          id: "11",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 20,
          y: 30,
          members: 8,
        },
      ],
      measure: "households",
      gapEmphasis: "outline",
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        covered: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        uncovered: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        overlap: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        total: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        households: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        members: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showOriginalOutlines: true,
    }),
  },
  { id: "changed", input: changedInput },
];
/** Common structural rejection examples. */
export const invalidInputs: unknown[] = [
  {},
  { ...defaultInput, extra: true },
  { ...defaultInput, copy: { ...defaultInput.copy, context: "x".repeat(45) } },
  { ...defaultInput, catchments: [] },
];
