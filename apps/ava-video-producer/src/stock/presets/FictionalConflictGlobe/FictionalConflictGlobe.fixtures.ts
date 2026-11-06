import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./FictionalConflictGlobe.schema";
/** Complete fictional authored defaults. */
export const DEFAULT_INPUT: Input = {
  incidents: [
    {
      id: "scenario-a",
      label: "Fictional situation A",
      latitude: 24,
      longitude: 12,
    },
    {
      id: "scenario-b",
      label: "Fictional situation B",
      latitude: -14,
      longitude: 28,
    },
    {
      id: "scenario-c",
      label: "Fictional situation C",
      latitude: 31,
      longitude: 72,
    },
  ],
  longitudeSweep: {
    start: -35,
    end: 85,
  },
  markerMeaning: "X = fictional conflict",
  scenarioCaption: "Fictional scenario on real geography",
  showLabels: true,
  showGraticule: true,
};

const minimumInput: Input = {
  ...DEFAULT_INPUT,
  incidents: [{ id: "", label: "", latitude: 0, longitude: 0 }],
  longitudeSweep: { start: -40, end: 0 },
};
const denseInput: Input = {
  ...DEFAULT_INPUT,
  incidents: [
    { id: "front 空", label: "W".repeat(28), latitude: 0, longitude: 85 },
    { id: "coincident", label: "W".repeat(28), latitude: 0, longitude: 85 },
    { id: "north", label: "W".repeat(28), latitude: 70, longitude: 70 },
    { id: "rear", label: "W".repeat(28), latitude: -60, longitude: -120 },
  ],
  markerMeaning: "W".repeat(36),
  scenarioCaption: "W".repeat(54),
};
/** The shortest forty-degree route crosses the dateline, not Greenwich. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  longitudeSweep: { start: 160, end: -160 },
  incidents: [
    { id: "east", label: "Dateline east", latitude: 0, longitude: 180 },
    { id: "west", label: "Dateline west", latitude: 10, longitude: -170 },
    { id: "rear", label: "Hidden hemisphere", latitude: 0, longitude: 0 },
  ],
};
const toggledInput: Input = {
  ...denseInput,
  showLabels: false,
  showGraticule: false,
};
/** Invalid sweeps, rear-only endpoint views and strict coordinate bounds. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, incidents: [] },
  {
    ...DEFAULT_INPUT,
    incidents: [DEFAULT_INPUT.incidents[0], DEFAULT_INPUT.incidents[0]],
  },
  { ...DEFAULT_INPUT, longitudeSweep: { start: 0, end: 20 } },
  { ...DEFAULT_INPUT, longitudeSweep: { start: 0, end: 180 } },
  {
    ...DEFAULT_INPUT,
    incidents: [{ id: "rear", label: "Rear", latitude: 0, longitude: -95 }],
  },
  {
    ...DEFAULT_INPUT,
    incidents: [{ ...DEFAULT_INPUT.incidents[0], latitude: 71 }],
  },
  { ...DEFAULT_INPUT, markerMeaning: "" },
  { ...DEFAULT_INPUT, scenarioCaption: "W".repeat(55) },
];
/** Default, minimum, dense, changed and toggled complete examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "toggled", input: toggledInput },
];
