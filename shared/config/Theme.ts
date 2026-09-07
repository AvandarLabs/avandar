export const AVANDAR_BLUE_SHADES = [
  "#edf6ff",
  "#d8ebff",
  "#b9dcff",
  "#89c7ff",
  "#51a7ff",
  "#2983ff",
  "#1563fe", // official brand color
  "#0b4aea",
  "#103dbd",
  "#143894",
] as const;

/**
 * The cool blue-gray ramp that carries the whole interface.
 *
 * Shades 0 through 6 are derived rather than picked: they are even steps in
 * OKLab lightness between two fixed anchors, index 0 (`#f8fafc`, the ground
 * every view sits on) and index 6 (`#486581`, the shell and sidebar, which is
 * `PRIMARY_COLOR_LIGHT_SHADE`). Deriving them is what keeps the steps even,
 * and even steps are what make a hover built on one pair of shades read like
 * the same hover built on another. Picking these by hand gives uneven steps
 * and costs that consistency.
 *
 * Shades 7 through 9 stay hand-picked. `#102a43` is the body-text ink and the
 * hue the entire shadow and border system is tinted from, so it is a fixed
 * brand value, not an output. Their steps compress slightly toward the dark
 * end, which is what you want: equal lightness steps read as too coarse in
 * the shadows.
 *
 * Interpolate in a perceptually uniform space if you ever regenerate these.
 * Even steps in sRGB are not even steps to the eye, and this ramp's job is to
 * look evenly spaced.
 */
export const NEUTRAL_SHADES = [
  "#f8fafc",
  "#d9e0e7",
  "#bac6d2",
  "#9cadbd",
  "#8094a9",
  "#637c95",
  "#486581", // anchor: the shell background and sidebar
  "#334e68",
  "#243b53",
  "#102a43", // body-text ink; the tint for every border and shadow
] as const;

export const PRIMARY_COLOR_LIGHT_SHADE = 6;
export const PRIMARY_COLOR = AVANDAR_BLUE_SHADES[6];
