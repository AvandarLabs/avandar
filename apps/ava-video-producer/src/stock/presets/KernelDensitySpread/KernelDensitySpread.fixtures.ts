import type { Input } from "./KernelDensitySpread.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  points: [
    { id: "a", x: 30, y: 45, weight: 1 },
    { id: "b", x: 45, y: 50, weight: 1 },
    { id: "c", x: 80, y: 70, weight: 1 },
  ],
  radii: { initial: 15, final: 30 },
  gridSize: 10,
  legendMaximum: 5,
  labels: {
    radius: "Smoothing radius",
    intensity: "Illustrative intensity",
    unit: "kernel units",
    points: "Same point observations",
  },
  showKernels: true,
};
/** Alternate input and toggles. */
export const CHANGED_INPUT: Input = {
  points: [
    { id: "a", x: 30, y: 45, weight: 1 },
    { id: "b", x: 45, y: 50, weight: 1 },
    { id: "c", x: 80, y: 70, weight: 1 },
  ],
  radii: { initial: 30, final: 15 },
  gridSize: 10,
  legendMaximum: 5,
  labels: {
    radius: "Smoothing radius",
    intensity: "Illustrative intensity",
    unit: "kernel units",
    points: "Same point observations",
  },
  showKernels: false,
};
/** Default, minimum, dense and changed documents. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      points: [
        { id: "a", x: 0, y: 0, weight: 1e-12 },
        { id: "b", x: 0, y: 0, weight: 1 },
      ],
      radii: { initial: 5, final: 6 },
      gridSize: 6,
      legendMaximum: 5,
      labels: {
        radius: "Smoothing radius",
        intensity: "Illustrative intensity",
        unit: "kernel units",
        points: "Same point observations",
      },
      showKernels: true,
    },
  },
  {
    id: "dense",
    input: {
      points: [
        { id: "0", x: 50, y: 50, weight: 5 },
        { id: "1", x: 50, y: 50, weight: 5 },
        { id: "2", x: 50, y: 50, weight: 5 },
        { id: "3", x: 50, y: 50, weight: 5 },
        { id: "4", x: 50, y: 50, weight: 5 },
      ],
      radii: { initial: 40, final: 5 },
      gridSize: 12,
      legendMaximum: 25,
      labels: {
        radius: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        intensity: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        unit: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        points: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showKernels: true,
    },
  },
  { id: "changed", input: CHANGED_INPUT },
];
/** Structural and semantic rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, points: [] },
  {
    ...DEFAULT_INPUT,
    points: [DEFAULT_INPUT.points[0], DEFAULT_INPUT.points[0]],
  },
  { ...DEFAULT_INPUT, radii: { initial: 15, final: 15 } },
  { ...DEFAULT_INPUT, legendMaximum: 2 },
  { ...DEFAULT_INPUT, gridSize: 5 },
  {
    ...DEFAULT_INPUT,
    points: DEFAULT_INPUT.points.map((point) => ({ ...point, weight: 0 })),
  },
];
