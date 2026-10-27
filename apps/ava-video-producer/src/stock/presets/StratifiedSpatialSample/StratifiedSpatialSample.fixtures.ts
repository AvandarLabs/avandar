import { inputSchema } from "./StratifiedSpatialSample.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete fictional defaults, validated at the content boundary. */
export const defaultInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    strata: [
      {
        id: "w",
        label: "West stratum",
        polygon: [
          [5, 5],
          [50, 5],
          [50, 95],
          [5, 95],
        ],
      },
      {
        id: "e",
        label: "East stratum",
        polygon: [
          [50, 5],
          [95, 5],
          [95, 95],
          [50, 95],
        ],
      },
    ],
    sites: [
      {
        id: "a",
        label: "Site A",
        stratumId: "w",
        x: 20,
        y: 20,
      },
      {
        id: "b",
        label: "Site B",
        stratumId: "w",
        x: 30,
        y: 50,
      },
      {
        id: "c",
        label: "Site C",
        stratumId: "w",
        x: 20,
        y: 80,
      },
      {
        id: "d",
        label: "Site D",
        stratumId: "e",
        x: 70,
        y: 25,
      },
      {
        id: "e",
        label: "Site E",
        stratumId: "e",
        x: 80,
        y: 75,
      },
    ],
    selectedSiteIds: ["a", "d"],
    copy: {
      context: "Fictional schematic sampling plan",
      selected: "Selected",
      eligible: "Eligible sites",
      unsampled: "Not selected",
      unit: "sites",
    },
    showUnselectedLabels: false,
  });
/** A complete alternate behavior and toggle input. */
export const changedInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    strata: [
      {
        id: "w",
        label: "West stratum",
        polygon: [
          [5, 5],
          [50, 5],
          [50, 95],
          [5, 95],
        ],
      },
      {
        id: "e",
        label: "East stratum",
        polygon: [
          [50, 5],
          [95, 5],
          [95, 95],
          [50, 95],
        ],
      },
    ],
    sites: [
      {
        id: "a",
        label: "Site A",
        stratumId: "w",
        x: 20,
        y: 20,
      },
      {
        id: "b",
        label: "Site B",
        stratumId: "w",
        x: 30,
        y: 50,
      },
      {
        id: "c",
        label: "Site C",
        stratumId: "w",
        x: 20,
        y: 80,
      },
      {
        id: "d",
        label: "Site D",
        stratumId: "e",
        x: 70,
        y: 25,
      },
      {
        id: "e",
        label: "Site E",
        stratumId: "e",
        x: 80,
        y: 75,
      },
    ],
    selectedSiteIds: ["a"],
    copy: {
      context: "Fictional schematic sampling plan",
      selected: "Selected",
      eligible: "Eligible sites",
      unsampled: "Not selected",
      unit: "sites",
    },
    showUnselectedLabels: true,
  });
/** Default, minimum, dense and changed-input cases. */
export const fixtures: StockContract<typeof defaultInput>["fixtures"] = [
  { id: "default", input: defaultInput },
  {
    id: "minimum",
    input: inputSchema.parse({
      strata: [
        {
          id: "",
          label: "West stratum",
          polygon: [
            [5, 5],
            [50, 5],
            [50, 95],
            [5, 95],
          ],
        },
        {
          id: "e",
          label: "East stratum",
          polygon: [
            [50, 5],
            [95, 5],
            [95, 95],
            [50, 95],
          ],
        },
      ],
      sites: [
        {
          id: "",
          label: "Site A",
          stratumId: "",
          x: 20,
          y: 20,
        },
        {
          id: "地 space",
          label: "Site B",
          stratumId: "",
          x: 30,
          y: 50,
        },
        {
          id: "c",
          label: "Site C",
          stratumId: "",
          x: 20,
          y: 80,
        },
        {
          id: "d",
          label: "Site D",
          stratumId: "e",
          x: 70,
          y: 25,
        },
      ],
      selectedSiteIds: [""],
      copy: {
        context: "Fictional schematic sampling plan",
        selected: "Selected",
        eligible: "Eligible sites",
        unsampled: "Not selected",
        unit: "sites",
      },
      showUnselectedLabels: false,
    }),
  },
  {
    id: "dense",
    input: inputSchema.parse({
      strata: [
        {
          id: "0",
          label: "MMMMMMMMMMMMMMMMMMMMMMMM",
          polygon: [
            [0, 0],
            [25, 0],
            [25, 100],
            [0, 100],
          ],
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
        },
      ],
      sites: [
        {
          id: "0",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "0",
          x: 12.5,
          y: 50,
        },
        {
          id: "1",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "0",
          x: 12.5,
          y: 50,
        },
        {
          id: "2",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "0",
          x: 12.5,
          y: 50,
        },
        {
          id: "3",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "1",
          x: 37.5,
          y: 50,
        },
        {
          id: "4",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "1",
          x: 37.5,
          y: 50,
        },
        {
          id: "5",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "1",
          x: 37.5,
          y: 50,
        },
        {
          id: "6",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "2",
          x: 62.5,
          y: 50,
        },
        {
          id: "7",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "2",
          x: 62.5,
          y: 50,
        },
        {
          id: "8",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "2",
          x: 62.5,
          y: 50,
        },
        {
          id: "9",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "3",
          x: 87.5,
          y: 50,
        },
        {
          id: "10",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "3",
          x: 87.5,
          y: 50,
        },
        {
          id: "11",
          label: "MMMMMMMMMMMMMMMMMMMM",
          stratumId: "3",
          x: 87.5,
          y: 50,
        },
      ],
      selectedSiteIds: ["0", "1", "2", "3", "4", "5", "6", "7"],
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        selected: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        eligible: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        unsampled: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        unit: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showUnselectedLabels: true,
    }),
  },
  { id: "changed", input: changedInput },
];
/** Common structural rejection examples. */
export const invalidInputs: unknown[] = [
  {},
  { ...defaultInput, extra: true },
  { ...defaultInput, copy: { ...defaultInput.copy, context: "x".repeat(45) } },
  { ...defaultInput, strata: [] },
];
