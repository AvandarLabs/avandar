import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./DocumentRegionDriftCheck.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  saved: {
    page: 2,
    box: [10, 20, 85, 70],
    header: "Site | Items",
    fingerprint: "FP-A",
  },
  current: {
    header: "Site | Items",
    fingerprint: "FP-B",
    detectorOrdinal: 4,
  },
  labels: {
    saved: "Saved selection",
    current: "Current file",
    matched: "Identity matched",
    review: "Content changed: review",
    geometry: "Same saved page region",
  },
  showDetectorOrdinal: true,
  copy: {
    context: "Fictional document",
    source: "Original",
    result: "Extracted result",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  saved: {
    page: 1,
    box: [50, 50, 50.000000001, 50.000000001],
    header: "",
    fingerprint: "x",
  },
  current: { header: "", fingerprint: "x", detectorOrdinal: 1 },
  showDetectorOrdinal: false,
};
const dense: Input = {
  ...DEFAULT_INPUT,
  saved: {
    page: 20,
    box: [0, 0, 100, 100],
    header: "W".repeat(30),
    fingerprint: "W".repeat(16),
  },
  current: {
    header: "X".repeat(30),
    fingerprint: "X".repeat(16),
    detectorOrdinal: 9,
  },
  labels: {
    saved: "W".repeat(30),
    current: "W".repeat(30),
    matched: "W".repeat(30),
    review: "W".repeat(30),
    geometry: "W".repeat(30),
  },
  copy: {
    context: "W".repeat(34),
    source: "W".repeat(34),
    result: "W".repeat(34),
  },
};
const changed: Input = {
  ...DEFAULT_INPUT,
  current: {
    ...DEFAULT_INPUT.current,
    fingerprint: "FP-A",
    detectorOrdinal: 9,
  },
  showDetectorOrdinal: false,
};
/** Whole-page, tiny positive region and exact matched-content examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
];
/** Rejections cover strict shape and page-coordinate ordering boundaries. */
export const invalidInputs: unknown[] = [
  undefined,
  {},
  { ...DEFAULT_INPUT, extra: true },
  ...[
    [0, 0, 0, 1],
    [0, 1, 1, 1],
    [-1, 0, 10, 10],
    [0, 0, 101, 10],
    [0, 0, 10, 101],
    [0, 0, 1],
  ].map((box) => ({
    ...DEFAULT_INPUT,
    saved: { ...DEFAULT_INPUT.saved, box },
  })),
  ...[0, 21, 1.5].map((page) => ({
    ...DEFAULT_INPUT,
    saved: { ...DEFAULT_INPUT.saved, page },
  })),
  {
    ...DEFAULT_INPUT,
    saved: { ...DEFAULT_INPUT.saved, header: "x".repeat(31) },
  },
  { ...DEFAULT_INPUT, current: { ...DEFAULT_INPUT.current, fingerprint: "" } },
  {
    ...DEFAULT_INPUT,
    current: { ...DEFAULT_INPUT.current, detectorOrdinal: 10 },
  },
];
