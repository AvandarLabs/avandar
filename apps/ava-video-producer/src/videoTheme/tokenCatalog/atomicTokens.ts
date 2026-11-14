import { scale } from "./defineTokens";

/**
 * Atomic scales under `other.video.atomic`: the only literal values in a
 * theme besides Mantine's own keys. Semantic and component tokens reference
 * them, for example `$atomic.strokeWidth.sm`.
 */
export const ATOMIC_TOKENS = {
  swatch: scale({
    kind: "color",
    label: "Swatch",
    description:
      "A named colour. Semantic colours point at swatches, and a colour picked in the editor becomes a new swatch.",
  }),
  fontFamily: scale({
    kind: "fontFamily",
    label: "Font face",
    description:
      "A registered font face. Graphic text accepts only faces with measured glyph widths.",
  }),
  fontWeight: scale({
    kind: "fontWeight",
    min: 100,
    max: 900,
    step: 100,
    label: "Font weight",
    description: "A font weight step.",
  }),
  letterSpacing: scale({
    kind: "letterSpacing",
    unit: "em",
    min: -0.1,
    max: 0.4,
    step: 0.005,
    label: "Letter spacing",
    description: "Tracking as a fraction of the font size.",
  }),
  size: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 400,
    step: 0.5,
    label: "Shape size",
    description:
      "A dimension of a drawn shape such as a dot, node, or glyph, in pixels of the surface that draws it.",
  }),
  strokeWidth: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 12,
    step: 0.1,
    label: "Stroke width",
    description: "A line thickness step.",
  }),
  opacity: scale({
    kind: "opacity",
    unit: "%",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Opacity",
    description: "An opacity step, keyed by its percentage.",
  }),
  shadow: scale({
    kind: "shadow",
    label: "Shadow",
    description:
      "Shadow geometry as stacked layers. Its colour comes from the elevation that uses it.",
  }),
  glow: scale({
    kind: "glow",
    label: "Glow",
    description:
      "A soft halo: how far it spreads past its shape, how blurred it is, and how opaque.",
  }),
  textShadow: scale({
    kind: "textShadow",
    label: "Text shadow",
    description:
      "Text shadow geometry. Its colour comes from the text style that uses it.",
  }),
  blur: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 48,
    step: 0.5,
    label: "Blur",
    description: "A blur radius step.",
  }),
  roughness: scale({
    kind: "number",
    min: 0,
    max: 3,
    step: 0.1,
    label: "Roughness",
    description:
      "How far a hand-drawn line wanders from its true path. Zero draws a clean line.",
  }),
  bowing: scale({
    kind: "number",
    min: 0,
    max: 10,
    step: 0.1,
    label: "Bowing",
    description: "How much a hand-drawn line bends between its ends.",
  }),
  seed: scale({
    kind: "number",
    min: 0,
    max: 9999,
    step: 1,
    label: "Sketch seed",
    description:
      "Fixes the random wobble of hand-drawn lines so every frame draws the same shape.",
  }),
  randomness: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 10,
    step: 0.1,
    label: "Sketch offset",
    description:
      "The largest random offset the points of a hand-drawn line may take.",
  }),
  dash: scale({
    kind: "dash",
    label: "Dash pattern",
    description:
      "Alternating dash and gap lengths. An empty pattern draws a solid line.",
  }),
  curveTension: scale({
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Curve tension",
    description:
      "Where a curved connector places its control points along the line between its ends.",
  }),
  duration: scale({
    kind: "duration",
    unit: "frames",
    min: 0,
    max: 120,
    step: 1,
    label: "Duration",
    description: "An animation length in frames at 30 fps.",
  }),
  easing: scale({
    kind: "easing",
    label: "Easing curve",
    description:
      "How an animation accelerates: cubic Bezier control points, or a symmetric power curve.",
  }),
  spring: scale({
    kind: "spring",
    label: "Spring",
    description:
      "Physical spring settings for a landing that should feel weighty.",
  }),
  stagger: scale({
    kind: "number",
    unit: "frames",
    min: 0,
    max: 30,
    step: 0.5,
    label: "Stagger",
    description: "Frames between siblings that start one after another.",
  }),
  period: scale({
    kind: "duration",
    unit: "frames",
    min: 1,
    max: 600,
    step: 1,
    label: "Period",
    description: "Frames for one cycle of a repeating motion.",
  }),
  distance: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 200,
    step: 1,
    label: "Distance",
    description:
      "How far an element travels during an entrance, an exit, or a drift.",
  }),
  typingRate: scale({
    kind: "number",
    unit: "cps",
    min: 1,
    max: 120,
    step: 1,
    label: "Typing rate",
    description: "Characters typed per second.",
  }),
  tempo: scale({
    kind: "number",
    unit: "×",
    min: 0.8,
    max: 1.5,
    step: 0.05,
    label: "Tempo",
    description:
      "A tempo step. Tempo divides animation durations inside a beat.",
  }),
  cameraSpeed: scale({
    kind: "number",
    unit: "×",
    min: 0.1,
    max: 4,
    step: 0.05,
    label: "Camera speed",
    description:
      "How fast a camera preset travels relative to its authored timing.",
  }),
  shutter: scale({
    kind: "number",
    unit: "deg",
    min: 0,
    max: 360,
    step: 5,
    label: "Shutter angle",
    description: "A motion blur shutter angle. 180 degrees matches film.",
  }),
  samples: scale({
    kind: "number",
    min: 2,
    max: 16,
    step: 1,
    label: "Blur samples",
    description: "A count of sub-frames blended for camera motion blur.",
  }),
  zoom: scale({
    kind: "number",
    unit: "×",
    min: 1,
    max: 3,
    step: 0.05,
    label: "Zoom",
    description: "A camera zoom limit.",
  }),
  velocityBlur: scale({
    kind: "number",
    min: 0,
    max: 5,
    step: 0.01,
    label: "Velocity blur",
    description: "Screen-space blur settings for fast single-object moves.",
  }),
} as const;
