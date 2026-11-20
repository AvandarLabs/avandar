import { token } from "../defineTokensHelpers";
import { CAMERA_TOKENS } from "./cameraTokens";
import { COLOR_TOKENS } from "./colorTokens";
import { MOTION_TOKENS } from "./motionTokens";
import { TEXT_TOKENS } from "./textTokens";

function _stroke(label: string, description: string) {
  return token({
    kind: "length",
    unit: "px",
    min: 0,
    max: 12,
    step: 0.1,
    label,
    description,
  });
}
function _corner(label: string, description: string) {
  return token({
    kind: "length",
    unit: "px",
    min: 0,
    max: 9999,
    step: 1,
    label,
    description,
  });
}
function _multiplier({
  label,
  description,
  range,
}: Readonly<{
  label: string;
  description: string;
  range: Readonly<{ min: number; max: number; step: number }>;
}>) {
  return token({ kind: "number", unit: "×", ...range, label, description });
}
function _alpha({
  label,
  description,
}: Readonly<{ label: string; description: string }>) {
  return token({
    kind: "opacity",
    unit: "%",
    min: 0,
    max: 1,
    step: 0.01,
    label,
    description,
  });
}
function _sketch(label: string, description: string) {
  return token({ kind: "sketchProfile", label, description });
}
/**
 * Semantic roles under `other.video.semantic`. A theme author sets these by
 * meaning ("the accent", "the caption style"); each one is a reference to
 * atomic or Mantine tokens, never a literal. Renderers read them through
 * `useVideoTokens` and CSS modules through `--video-*` variables.
 */
export const SEMANTIC_TOKENS = {
  color: COLOR_TOKENS,
  text: TEXT_TOKENS,
  stroke: {
    guide: _stroke(
      "Guide stroke",
      "Orbits, guides, and other construction lines.",
    ),
    hairline: _stroke(
      "Hairline stroke",
      "The thinnest outline, for hub rims, rows, and fine dividers.",
    ),
    outline: _stroke("Outline stroke", "Outlines of panels, nodes, and cards."),
    default: _stroke("Default stroke", "Edges, connectors, and drawn paths."),
    annotation: _stroke(
      "Annotation stroke",
      "Hand-drawn underlines and annotations.",
    ),
    route: _stroke("Route stroke", "A highlighted route through a diagram."),
    emphasis: _stroke(
      "Emphasis stroke",
      "Outlines and paths that carry the point: the active box, the chosen route.",
    ),
    heavy: _stroke(
      "Heavy stroke",
      "The thickest line role, for bold rules, ticks, and marks.",
    ),
    scale: _multiplier({
      label: "Line weight",
      description:
        "Multiplies every stroke a graphic draws, including shape-specific widths. 1 draws them as authored.",
      range: { min: 0.25, max: 3, step: 0.05 },
    }),
  },
  corner: {
    panel: _corner("Panel corner", "Corner radius of panels inside a graphic."),
    pill: _corner("Pill corner", "Corner radius of pill-shaped tags."),
    card: _corner(
      "Card corner",
      "Corner radius of summary cards inside a graphic.",
    ),
    chip: _corner(
      "Chip corner",
      "Corner radius of evidence chips on the stage.",
    ),
    sharedObject: _corner(
      "Shared object corner",
      "Corner radius of an object that travels between motions.",
    ),
    spotlight: _corner(
      "Spotlight corner",
      "Corner radius of a spotlight cut-out.",
    ),
    label: _corner("Label corner", "Corner radius of a floating label."),
    cell: _corner(
      "Cell corner",
      "Corner radius of table cells, slots, and other small boxes in a graphic.",
    ),
    scene: _corner(
      "Scene corner",
      "Corner radius of cards, panels, captions, and media in a storyboard scene.",
    ),
    scale: _multiplier({
      label: "Corner style",
      description:
        "Multiplies every corner radius, including shape-specific ones. 0 draws square corners.",
      range: { min: 0, max: 3, step: 0.05 },
    }),
  },
  alpha: {
    wash: _alpha({
      label: "Wash",
      description:
        "The faint accent fill behind an active row, cell, or region.",
    }),
    tint: _alpha({
      label: "Tint",
      description:
        "A stronger accent fill, such as the head of a glyph or a selected chip.",
    }),
    ghost: _alpha({
      label: "Ghost",
      description:
        "Shapes that remain as a trace: a removed item, a past position.",
    }),
    dimmed: _alpha({
      label: "Dimmed",
      description: "Shapes stepped back while another is the point.",
    }),
    guide: _alpha({
      label: "Guide",
      description:
        "Construction marks and guides that should read under the content.",
    }),
    washScale: _multiplier({
      label: "Tint strength",
      description:
        "Multiplies wash and tint fills behind active items. 1 draws them as authored.",
      range: { min: 0, max: 2, step: 0.05 },
    }),
  },
  dash: {
    guide: token({
      kind: "dash",
      label: "Guide dash",
      description: "The dash of guides, boundaries, and construction lines.",
    }),
    pending: token({
      kind: "dash",
      label: "Pending dash",
      description:
        "The dash of an outline still waiting on its content: a pending step or a slot about to fill.",
    }),
    placeholder: token({
      kind: "dash",
      label: "Placeholder dash",
      description:
        "The dash of an outline standing in for something missing or absent, such as a missing partner, an empty form, or a stencil.",
    }),
    planned: token({
      kind: "dash",
      label: "Planned dash",
      description:
        "The dash of an outline for something planned but not there yet: an empty visit slot or a planned shade footprint.",
    }),
  },
  elevation: {
    flat: token({
      kind: "elevation",
      label: "Flat",
      description: "Surfaces that sit on the ground with no shadow.",
    }),
    floating: token({
      kind: "elevation",
      label: "Floating",
      description:
        "Surfaces that hover over the stage, such as floating labels and lifted diagrams.",
    }),
    window: token({
      kind: "shadow",
      surface: "stage",
      label: "Window shadow",
      description:
        "The cast shadow under a tilted window. Its colour is the scene shadow, or the scene background at 60% when that is unset.",
    }),
    strength: _multiplier({
      label: "Shadow intensity",
      description:
        "Multiplies the opacity of every shadow. 0 removes shadows and 1 draws them as authored.",
      range: { min: 0, max: 2, step: 0.05 },
    }),
  },
  effect: {
    halo: token({
      kind: "glow",
      label: "Halo",
      description: "The soft glow around packets and highlighted points.",
    }),
  },
  sketch: {
    profile: {
      smooth: _sketch("Smooth", "Clean geometric lines."),
      subtle: _sketch("Subtle", "Lines with a slight hand-drawn wobble."),
      sketch: _sketch("Sketch", "Lines that read as drawn by hand."),
      rough: _sketch("Rough", "Loose, expressive hand-drawn lines."),
    },
    box: _sketch(
      "Box sketch",
      "The sketch profile boxes, panels, and pills use.",
    ),
    annotation: _sketch(
      "Annotation sketch",
      "The sketch profile underlines, brackets, and annotations use.",
    ),
    shape: _sketch(
      "Shape sketch",
      "The sketch profile nodes, edges, and guides use.",
    ),
  },
  layout: {
    graphic: {
      margin: token({
        kind: "length",
        surface: "graphic",
        unit: "px",
        min: 0,
        max: 300,
        step: 1,
        label: "Graphic margin",
        description: "Distance from the edges of a graphic to its content.",
      }),
      eyebrowOrigin: token({
        kind: "box",
        surface: "graphic",
        label: "Eyebrow position",
        description:
          "Where the eyebrow baseline starts: x from the left edge and y from the top.",
      }),
      captionBaseline: token({
        kind: "length",
        surface: "graphic",
        unit: "px",
        min: 0,
        max: 300,
        step: 1,
        label: "Caption baseline",
        description:
          "Distance from the bottom of a graphic to the baseline of its caption.",
      }),
    },
    stage: {
      headingInset: token({
        kind: "box",
        surface: "stage",
        label: "Heading inset",
        description:
          "Where the heading block of a beat sits: x from both sides and top from the top edge.",
      }),
      graphicInset: token({
        kind: "box",
        surface: "stage",
        label: "Graphic inset",
        description:
          "Where the graphic of a beat sits: x from both sides, plus top and bottom.",
      }),
      evidenceRow: token({
        kind: "box",
        surface: "stage",
        label: "Evidence row",
        description:
          "Where the evidence row sits: x from both sides, bottom from the bottom edge, and the gap between chips.",
      }),
    },
  },
  motion: MOTION_TOKENS,
  camera: CAMERA_TOKENS,
  motionBlur: {
    shutter: token({
      kind: "number",
      unit: "deg",
      min: 0,
      max: 360,
      step: 5,
      label: "Shutter angle",
      description:
        "Shutter angle for camera motion blur when the camera follows its authored timing.",
    }),
    samples: token({
      kind: "number",
      min: 2,
      max: 16,
      step: 1,
      label: "Blur samples",
      description: "Sub-frames blended for camera motion blur.",
    }),
    velocityFactor: token({
      kind: "number",
      min: 0,
      max: 1,
      step: 0.01,
      label: "Velocity blur factor",
      description:
        "Blur pixels for each pixel of travel per frame in a single-object move.",
    }),
    velocityMax: token({
      kind: "length",
      unit: "px",
      min: 0,
      max: 20,
      step: 0.5,
      label: "Velocity blur limit",
      description: "The most blur a single-object move can get.",
    }),
    transitionBlur: token({
      kind: "length",
      unit: "px",
      min: 0,
      max: 48,
      step: 0.5,
      label: "Transition blur",
      description:
        "Peak blur of a spatial transition at full strength and a 180 degree shutter.",
    }),
    strength: _multiplier({
      label: "Motion blur strength",
      description:
        "Multiplies camera and transition motion blur. 0 turns it off.",
      range: { min: 0, max: 2, step: 0.05 },
    }),
  },
} as const;
