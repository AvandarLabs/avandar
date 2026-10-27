import { inputSchema } from "./ClusterEpicurveLink.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete fictional defaults, validated at the content boundary. */
export const defaultInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    cases: [
      {
        id: "a",
        label: "Case A",
        x: 25,
        y: 35,
        onsetBinId: "d1",
      },
      {
        id: "b",
        label: "Case B",
        x: 35,
        y: 42,
        onsetBinId: "d2",
      },
      {
        id: "c",
        label: "Case C",
        x: 30,
        y: 52,
        onsetBinId: null,
      },
      {
        id: "d",
        label: "Case D",
        x: 75,
        y: 30,
        onsetBinId: "d2",
      },
      {
        id: "e",
        label: "Case E",
        x: 80,
        y: 65,
        onsetBinId: "d3",
      },
    ],
    timeBins: [
      {
        id: "d1",
        label: "Day 1",
      },
      {
        id: "d2",
        label: "Day 2",
      },
      {
        id: "d3",
        label: "Day 3",
      },
    ],
    investigationCaseIds: ["a", "b", "c"],
    focusedBinId: "d2",
    copy: {
      context: "Fictional case review; schematic map",
      map: "Recorded case locations",
      curve: "Cases by recorded onset day",
      unknown: "Onset unknown",
      selected: "Investigation group",
      total: "All supplied cases",
      unit: "cases",
    },
    showIdentityGuides: true,
  });
/** A complete alternate behavior and toggle input. */
export const changedInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    cases: [
      {
        id: "a",
        label: "Case A",
        x: 25,
        y: 35,
        onsetBinId: null,
      },
      {
        id: "b",
        label: "Case B",
        x: 35,
        y: 42,
        onsetBinId: null,
      },
      {
        id: "c",
        label: "Case C",
        x: 30,
        y: 52,
        onsetBinId: null,
      },
      {
        id: "d",
        label: "Case D",
        x: 75,
        y: 30,
        onsetBinId: null,
      },
      {
        id: "e",
        label: "Case E",
        x: 80,
        y: 65,
        onsetBinId: null,
      },
    ],
    timeBins: [
      {
        id: "d1",
        label: "Day 1",
      },
      {
        id: "d2",
        label: "Day 2",
      },
      {
        id: "d3",
        label: "Day 3",
      },
    ],
    investigationCaseIds: ["a", "b", "c"],
    focusedBinId: null,
    copy: {
      context: "Fictional case review; schematic map",
      map: "Recorded case locations",
      curve: "Cases by recorded onset day",
      unknown: "Onset unknown",
      selected: "Investigation group",
      total: "All supplied cases",
      unit: "cases",
    },
    showIdentityGuides: false,
  });
/** Default, minimum, dense and changed-input cases. */
export const fixtures: StockContract<typeof defaultInput>["fixtures"] = [
  { id: "default", input: defaultInput },
  {
    id: "minimum",
    input: inputSchema.parse({
      cases: [
        {
          id: "",
          label: "Case A",
          x: 25,
          y: 35,
          onsetBinId: "",
        },
        {
          id: "例 space",
          label: "Case B",
          x: 35,
          y: 42,
          onsetBinId: "d2",
        },
        {
          id: "c",
          label: "Case C",
          x: 30,
          y: 52,
          onsetBinId: null,
        },
      ],
      timeBins: [
        {
          id: "",
          label: "Day 1",
        },
        {
          id: "d2",
          label: "Day 2",
        },
        {
          id: "d3",
          label: "Day 3",
        },
      ],
      investigationCaseIds: [""],
      focusedBinId: "",
      copy: {
        context: "Fictional case review; schematic map",
        map: "Recorded case locations",
        curve: "Cases by recorded onset day",
        unknown: "Onset unknown",
        selected: "Investigation group",
        total: "All supplied cases",
        unit: "cases",
      },
      showIdentityGuides: true,
    }),
  },
  {
    id: "dense",
    input: inputSchema.parse({
      cases: [
        {
          id: "0",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "1",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "2",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "3",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "4",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "5",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "6",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "7",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "8",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "9",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "10",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
        {
          id: "11",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 50,
          y: 50,
          onsetBinId: "0",
        },
      ],
      timeBins: [
        {
          id: "0",
          label: "MMMMMMMMMMMMMMMM",
        },
        {
          id: "1",
          label: "MMMMMMMMMMMMMMMM",
        },
        {
          id: "2",
          label: "MMMMMMMMMMMMMMMM",
        },
        {
          id: "3",
          label: "MMMMMMMMMMMMMMMM",
        },
        {
          id: "4",
          label: "MMMMMMMMMMMMMMMM",
        },
        {
          id: "5",
          label: "MMMMMMMMMMMMMMMM",
        },
      ],
      investigationCaseIds: ["0", "1", "2", "3", "4", "5", "6", "7"],
      focusedBinId: "0",
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        map: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        curve: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        unknown: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        selected: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        total: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        unit: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showIdentityGuides: true,
    }),
  },
  { id: "changed", input: changedInput },
];
/** Common structural rejection examples. */
export const invalidInputs: unknown[] = [
  {},
  { ...defaultInput, extra: true },
  { ...defaultInput, copy: { ...defaultInput.copy, context: "x".repeat(45) } },
  { ...defaultInput, timeBins: [] },
];
