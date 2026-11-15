import { capitalize } from "@avandar/utils";
import { humanizeScaleKey } from "../customScaleKey/customScaleKey";

/*
 * Names the editor shows that are not catalog copy: section names, composite
 * field names, and enum options.
 */

/** Readable words for a component name, such as `Progress bar` for `ProgressBar`. */
function _humanize(name: string): string {
  return capitalize(humanizeScaleKey(name));
}

const GROUP_NAMES: Readonly<Record<string, string>> = {
  "semantic:color": "Colour",
  "semantic:text": "Type",
  "semantic:stroke": "Strokes",
  "semantic:corner": "Corners",
  "semantic:elevation": "Elevation",
  "semantic:effect": "Effects",
  "semantic:sketch": "Sketch",
  "semantic:layout": "Layout",
  "semantic:motion": "Motion",
  "semantic:camera": "Camera",
  "semantic:motionBlur": "Motion blur",
  "mantine:palette": "Palettes",
  "mantine:type": "Type scale",
  "mantine:dimension": "Radii and spacing",
  "mantine:rendering": "Rendering",
};

/** Section names for semantic and Mantine groups. Atomic groups use their scale's catalog label. */
export function getGroupName(group: string): string | undefined {
  const [tier, name] = group.split(":");
  return tier === "component" ? _humanize(name) : GROUP_NAMES[group];
}

/** Names of type style fields. */
const TYPE_FIELD_NAMES: Readonly<Record<string, string>> = {
  family: "Font",
  size: "Size",
  weight: "Weight",
  lineHeight: "Line height",
  letterSpacing: "Letter spacing",
  transform: "Letter case",
  numeric: "Numerals",
  color: "Colour",
  alpha: "Opacity",
  textShadow: "Text shadow",
  glow: "Glow",
  stroke: "Outline",
};

const FIELD_NAMES: Readonly<Record<string, string>> = {
  ...TYPE_FIELD_NAMES,
  shadow: "Shadow",
  roughness: "Roughness",
  bowing: "Bowing",
  seed: "Seed",
  randomness: "Offset",
  top: "Top",
  right: "Right",
  bottom: "Bottom",
  left: "Left",
  x: "Horizontal",
  y: "Vertical",
  gap: "Gap",
  duration: "Duration",
  easing: "Curve",
  distance: "Distance",
  spring: "Spring",
  period: "Cycle",
  rate: "Rate",
  speed: "Speed",
  shutter: "Shutter angle",
  min: "Minimum",
  max: "Maximum",
  onDark: "On dark backgrounds",
  onLight: "On light backgrounds",
};

/** Names of every composite field, for labels such as "Size" or "Curve". */
export function getFieldName(field: string): string {
  return FIELD_NAMES[field] ?? field;
}

/** One enum option's name and, for camera presets, what it feels like. */
export type OptionCopy = Readonly<{ label: string; description?: string }>;

/** Camera preset names and the editorial intent of each. */
const CAMERA_PRESET_COPY: Readonly<Record<string, OptionCopy>> = {
  authored: {
    label: "Composition default",
    description: "Keeps the speed, easing, and blur defined in each scene.",
  },
  deliberate: {
    label: "Deliberate",
    description:
      "Patient and investigative. Gives viewers time to inspect an unfamiliar system or a dense diagram.",
  },
  gentle: {
    label: "Gentle",
    description:
      "Calm and instructional. A gradual change of focus for tutorials and teaching.",
  },
  balanced: {
    label: "Balanced",
    description:
      "Measured and readable. Connects related ideas without drawing attention away from the explanation.",
  },
  brisk: {
    label: "Brisk",
    description:
      "Confident and purposeful. Moves promptly between familiar landmarks, with a more emphatic start and stop.",
  },
  whip: {
    label: "Whip",
    description:
      "Fast and energetic. Adds a brief burst of momentum at a major subject change. Use it sparingly.",
  },
};

const OPTION_COPY: Readonly<
  Record<string, Readonly<Record<string, OptionCopy>>>
> = {
  "camera.preset": CAMERA_PRESET_COPY,
  transform: {
    none: { label: "As written" },
    uppercase: { label: "Uppercase" },
    lowercase: { label: "Lowercase" },
    capitalize: { label: "Capitalized" },
  },
  numeric: {
    normal: { label: "Proportional" },
    "tabular-nums": { label: "Tabular" },
  },
  primaryColor: {
    primary: { label: "Primary" },
    neutral: { label: "Neutral" },
    secondary: { label: "Secondary" },
    success: { label: "Success" },
    warning: { label: "Warning" },
    danger: { label: "Danger" },
    info: { label: "Info" },
  },
};

/** Names for enum options by token path or composite field name. */
export function getOptionCopy(
  options: Readonly<{ key: string; option: string }>,
): OptionCopy {
  const { key, option } = options;
  return OPTION_COPY[key]?.[option] ?? { label: option };
}
