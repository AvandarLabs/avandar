import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./SurveillanceReportingBackfill.schema";
/** Complete fictional default, exactly as authored. */
export const DEFAULT_INPUT: Input = {
  records: [
    {
      id: "a",
      label: "Record A",
      eventBinId: "d1",
      firstSnapshot: 0,
    },
    {
      id: "b",
      label: "Record B",
      eventBinId: "d2",
      firstSnapshot: 0,
    },
    {
      id: "c",
      label: "Record C",
      eventBinId: "d1",
      firstSnapshot: 1,
    },
    {
      id: "d",
      label: "Record D",
      eventBinId: "d2",
      firstSnapshot: 1,
    },
    {
      id: "e",
      label: "Record E",
      eventBinId: "d3",
      firstSnapshot: 1,
    },
  ],
  eventBins: [
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
  snapshots: [
    {
      label: "Reports received by Day 4",
    },
    {
      label: "Reports received by Day 5",
    },
  ],
  copy: {
    context: "Fictional reporting snapshots",
    axis: "Recorded event day",
    unit: "records",
    earlier: "Earlier snapshot",
    revised: "Revised snapshot",
    newReports: "Newly received reports",
  },
  showPriorOutline: true,
};
/** Minimum collections including valid empty identifiers. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  records: [
    { ...DEFAULT_INPUT["records"][0], id: "", label: "", eventBinId: "" },
    { ...DEFAULT_INPUT["records"][1], label: "" },
    { ...DEFAULT_INPUT["records"][2], label: "", eventBinId: "" },
  ],
  eventBins: [
    { ...DEFAULT_INPUT["eventBins"][0], id: "" },
    DEFAULT_INPUT["eventBins"][1],
    DEFAULT_INPUT["eventBins"][2],
  ],
};
/** Maximum collections and accepted text bounds. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  records: [
    {
      ...DEFAULT_INPUT["records"][0],
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "0",
    },
    {
      ...DEFAULT_INPUT["records"][1],
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "1",
    },
    {
      ...DEFAULT_INPUT["records"][2],
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "2",
      firstSnapshot: 0,
    },
    {
      ...DEFAULT_INPUT["records"][3],
      id: "3",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "3",
      firstSnapshot: 0,
    },
    {
      ...DEFAULT_INPUT["records"][4],
      id: "4",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "4",
      firstSnapshot: 0,
    },
    {
      id: "5",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "0",
      firstSnapshot: 1,
    },
    {
      id: "6",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "1",
      firstSnapshot: 1,
    },
    {
      id: "7",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "2",
      firstSnapshot: 1,
    },
    {
      id: "8",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "3",
      firstSnapshot: 1,
    },
    {
      id: "9",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "4",
      firstSnapshot: 1,
    },
    {
      id: "10",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "0",
      firstSnapshot: 1,
    },
    {
      id: "11",
      label: "WWWWWWWWWWWWWWWWWWWW",
      eventBinId: "1",
      firstSnapshot: 1,
    },
  ],
  eventBins: [
    { ...DEFAULT_INPUT["eventBins"][0], id: "0", label: "WWWWWWWWWWWWWWWW" },
    { ...DEFAULT_INPUT["eventBins"][1], id: "1", label: "WWWWWWWWWWWWWWWW" },
    { ...DEFAULT_INPUT["eventBins"][2], id: "2", label: "WWWWWWWWWWWWWWWW" },
    { id: "3", label: "WWWWWWWWWWWWWWWW" },
    { id: "4", label: "WWWWWWWWWWWWWWWW" },
  ],
  snapshots: [
    {
      ...DEFAULT_INPUT["snapshots"][0],
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
    {
      ...DEFAULT_INPUT["snapshots"][1],
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  ],
  copy: {
    ...DEFAULT_INPUT["copy"],
    context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    axis: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    earlier: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    revised: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    newReports: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
};
/** Changed authored quantities or optional presentation. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  records: [
    {
      ...DEFAULT_INPUT["records"][0],
      id: "e",
      label: "Record E",
      eventBinId: "d3",
      firstSnapshot: 1,
    },
    {
      ...DEFAULT_INPUT["records"][1],
      id: "d",
      label: "Record D",
      firstSnapshot: 1,
    },
    DEFAULT_INPUT["records"][2],
    {
      ...DEFAULT_INPUT["records"][3],
      id: "b",
      label: "Record B",
      firstSnapshot: 0,
    },
    {
      ...DEFAULT_INPUT["records"][4],
      id: "a",
      label: "Record A",
      eventBinId: "d1",
      firstSnapshot: 0,
    },
  ],
  showPriorOutline: false,
};
/** Spaces and Unicode remain valid authored identifiers and references. */
const unicodeInput: Input = {
  ...DEFAULT_INPUT,
  records: [
    { ...DEFAULT_INPUT["records"][0], id: " α a", eventBinId: " α d1" },
    { ...DEFAULT_INPUT["records"][1], id: " α b", eventBinId: " α d2" },
    { ...DEFAULT_INPUT["records"][2], id: " α c", eventBinId: " α d1" },
    { ...DEFAULT_INPUT["records"][3], id: " α d", eventBinId: " α d2" },
    { ...DEFAULT_INPUT["records"][4], id: " α e", eventBinId: " α d3" },
  ],
  eventBins: [
    { ...DEFAULT_INPUT["eventBins"][0], id: " α d1" },
    { ...DEFAULT_INPUT["eventBins"][1], id: " α d2" },
    { ...DEFAULT_INPUT["eventBins"][2], id: " α d3" },
  ],
};
/** Incomplete documents, extra keys and invalid semantic relationships. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  {
    ...DEFAULT_INPUT,
    records: [
      { ...DEFAULT_INPUT["records"][0], eventBinId: "missing" },
      { ...DEFAULT_INPUT["records"][1], eventBinId: "missing" },
      { ...DEFAULT_INPUT["records"][2], eventBinId: "missing" },
      { ...DEFAULT_INPUT["records"][3], eventBinId: "missing" },
      { ...DEFAULT_INPUT["records"][4], eventBinId: "missing" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    records: [
      DEFAULT_INPUT["records"][0],
      DEFAULT_INPUT["records"][1],
      { ...DEFAULT_INPUT["records"][2], firstSnapshot: 0 },
      { ...DEFAULT_INPUT["records"][3], firstSnapshot: 0 },
      { ...DEFAULT_INPUT["records"][4], firstSnapshot: 0 },
    ],
  },
  { ...DEFAULT_INPUT, snapshots: [] },
];
/** Deterministic collection, text, quantity and identity cases. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "unicode", input: unicodeInput },
];
