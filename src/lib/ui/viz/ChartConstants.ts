/**
 * Padding (in px) added to each end of the X axis so the first and last
 * tick labels are not clipped by the chart container edge.
 */
export const X_AXIS_PADDING = { left: 30, right: 30 } as const;

/**
 * Bubble size range [minArea, maxArea] in pixels² passed to Recharts ZAxis.
 * Maps the smallest z value to ~10px radius and largest to ~32px radius.
 */
export const BUBBLE_SIZE_RANGE: [number, number] = [100, 3200] as const;

/**
 * Swatches matching CHART_COLORS for use in ColorInput components.
 * Uses Mantine CSS variables so they stay in sync with the theme.
 */
export const CHART_COLOR_SWATCHES = [
  "#228be6", // blue.6
  "#12b886", // teal.6
  "#fab005", // yellow.6
  "#fd7e14", // orange.6
  "#fa5252", // red.6
  "#be4bdb", // grape.6
  "#4c6ef5", // indigo.6
  "#15aabf", // cyan.6
  "#40c057", // green.6
  "#e64980", // pink.6
];

/**
 * Fixed color cycle used for pie, donut, funnel, and radar chart slices.
 * Expressed as Mantine color strings (e.g. `"blue.6"`).
 */
export const CHART_COLORS = [
  "blue.6",
  "teal.6",
  "yellow.6",
  "orange.6",
  "red.6",
  "grape.6",
  "indigo.6",
  "cyan.6",
  "green.6",
  "pink.6",
] as const;
