import { token } from "./defineTokens";
import type { TokenSurface } from "../videoTheme.types";

const CAPS = ["butt", "round", "square"] as const;
const JOINS = ["miter", "round", "bevel"] as const;

function _length(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "length",
    surface,
    unit: "px",
    min: 0,
    max: 400,
    step: 0.5,
    label,
    description,
  });
}
function _offset(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "length",
    surface,
    unit: "px",
    min: -200,
    max: 200,
    step: 0.5,
    label,
    description,
  });
}
function _stroke(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "length",
    surface,
    unit: "px",
    min: 0,
    max: 12,
    step: 0.1,
    label,
    description,
  });
}
function _alpha(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "opacity",
    surface,
    unit: "%",
    min: 0,
    max: 1,
    step: 0.005,
    label,
    description,
  });
}
function _color(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({ kind: "color", surface, label, description });
}
function _duration(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({
    kind: "duration",
    surface,
    unit: "frames",
    min: 0,
    max: 240,
    step: 1,
    label,
    description,
  });
}
function _easing(
  label: string,
  description: string,
  surface: TokenSurface = "graphic",
) {
  return token({ kind: "easing", surface, label, description });
}
function _number(
  label: string,
  description: string,
  range: Readonly<{ min: number; max: number; step: number }>,
) {
  return token({
    kind: "number",
    surface: "graphic",
    ...range,
    label,
    description,
  });
}
function _enum<const Options extends readonly string[]>(
  label: string,
  description: string,
  options: Options,
) {
  return token({
    kind: "enum",
    surface: "graphic",
    options,
    label,
    description,
  });
}
function _dash(label: string, description: string) {
  return token({ kind: "dash", surface: "graphic", label, description });
}
function _glow(label: string, description: string) {
  return token({ kind: "glow", surface: "graphic", label, description });
}

const NODE_TOKENS = {
  radiusXs: _length(
    "Extra-small node radius",
    "Radius of the smallest nodes, such as the spokes of a radial network.",
  ),
  radiusSm: _length(
    "Small node radius",
    "Radius of small nodes, such as the outer nodes of a network graph.",
  ),
  radiusMd: _length("Node radius", "Radius of a standard node."),
  radiusLg: _length(
    "Large node radius",
    "Radius of large nodes, such as the stops of a traversal.",
  ),
  radiusXl: _length(
    "Hub node radius",
    "Radius of a hub node at the centre of a network.",
  ),
  fill: _color("Node fill", "Fill behind a node's tint."),
  stroke: _color("Node outline colour", "Colour of a node's resting outline."),
  strokeWidth: _stroke("Node outline width", "Width of a node's outlines."),
  ringSpread: _length(
    "Node ring spread",
    "How far the active ring sits outside a node.",
  ),
  ringAlpha: _alpha(
    "Node ring opacity",
    "Opacity of the active ring at full activity.",
  ),
  tintAlpha: _alpha(
    "Node tint opacity",
    "Opacity of the accent tint inside a node at full activity.",
  ),
  outlineAlpha: _alpha(
    "Node accent outline opacity",
    "Opacity of the accent outline at rest; it rises to full as the node activates.",
  ),
  coreRadius: _length(
    "Node core radius",
    "Radius of the dot at a node's centre at rest.",
  ),
  coreGrowth: _length(
    "Node core growth",
    "How much the centre dot grows at full activity.",
  ),
  labelOffset: _offset(
    "Node label offset",
    "Distance from a node's edge to its label baseline.",
  ),
  detailOffset: _offset(
    "Node detail offset",
    "Distance from a node's edge to its detail baseline.",
  ),
} as const;

const SHARED_GRAPHIC_TOKENS = {
  Node: NODE_TOKENS,
  Edge: {
    color: _color(
      "Edge colour",
      "Colour of an edge that names no colour of its own.",
    ),
    strokeWidth: _stroke("Edge width", "Width of edges and drawn paths."),
    cap: _enum("Edge cap", "How edge ends are drawn.", CAPS),
    dash: _dash(
      "Edge dash",
      "Dash pattern of dashed edges, in fractions of the path length.",
    ),
    drawDuration: _duration(
      "Edge draw duration",
      "How long an edge takes to draw itself in.",
    ),
    drawEasing: _easing(
      "Edge draw curve",
      "The curve of an edge drawing itself in.",
    ),
    curveTension: _number(
      "Edge curve tension",
      "Where a curved edge places its control points.",
      { min: 0, max: 1, step: 0.01 },
    ),
  },
  Route: {
    strokeWidth: _stroke("Route width", "Width of a highlighted route."),
    cap: _enum("Route cap", "How route ends are drawn.", CAPS),
    fadeIn: _duration("Route fade-in", "How long a route takes to appear."),
  },
  Packet: {
    color: _color(
      "Packet colour",
      "Colour of a packet that names no colour of its own.",
    ),
    radius: _length("Packet radius", "Radius of a packet."),
    radiusSm: _length(
      "Small packet radius",
      "Radius of a packet on a secondary edge.",
    ),
    period: _duration(
      "Packet period",
      "Frames for a packet to travel its edge once.",
    ),
    curveTension: _number(
      "Packet curve tension",
      "Where a packet's curved path places its control points.",
      { min: 0, max: 1, step: 0.01 },
    ),
    fadeIn: _duration("Packet fade-in", "How long packets take to appear."),
  },
  Halo: {
    glow: _glow("Halo glow", "The soft disc around a packet."),
  },
  Particle: {
    radius: _length("Particle radius", "Radius of an ambient particle."),
    radiusLg: _length(
      "Large particle radius",
      "Radius of an emphasised particle.",
    ),
    haloRadius: _length(
      "Particle halo radius",
      "Radius of the halo around an emphasised particle.",
    ),
    haloAlpha: _alpha(
      "Particle halo opacity",
      "Opacity of the halo around an emphasised particle.",
    ),
    twinklePeriod: _duration(
      "Particle twinkle period",
      "Frames for one particle twinkle cycle.",
    ),
    twinkleFloor: _alpha(
      "Particle twinkle floor",
      "The lowest opacity a twinkling particle reaches.",
    ),
  },
  Guide: {
    color: _color(
      "Guide colour",
      "Colour of orbit guides and construction lines.",
    ),
    alpha: _alpha("Guide opacity", "Opacity of guides."),
    strokeWidth: _stroke("Guide width", "Width of dashed guides."),
    dash: _dash("Guide dash", "Dash pattern of guides, in pixels."),
  },
  Panel: {
    fill: _color("Panel fill", "Fill of a panel."),
    stroke: _color("Panel outline colour", "Outline colour of a panel."),
    radius: _length("Panel radius", "Corner radius of a panel."),
    strokeWidth: _stroke("Panel outline width", "Outline width of a panel."),
  },
  Card: {
    radius: _length("Card radius", "Corner radius of a tinted summary card."),
    fillAlpha: _alpha("Card fill opacity", "Opacity of a card's tint."),
    strokeAlpha: _alpha("Card outline opacity", "Opacity of a card's outline."),
    padding: _length(
      "Card padding",
      "Space between a card's edge and its text.",
    ),
    textBaseline: _length(
      "Card text baseline",
      "Distance from a card's top to its first text baseline.",
    ),
    baseHeight: _length(
      "Card base height",
      "A card's height before its text lines are added.",
    ),
  },
  Pill: {
    color: _color(
      "Pill colour",
      "Colour of a pill that names no colour of its own.",
    ),
    width: _length(
      "Pill width",
      "Width of a pill that names no width of its own.",
    ),
    height: _length("Pill height", "Height of a pill."),
    radius: _length(
      "Pill radius",
      "Corner radius of a pill, limited to half its height.",
    ),
    fillAlpha: _alpha("Pill fill opacity", "Opacity of a pill's tint."),
    strokeAlpha: _alpha("Pill outline opacity", "Opacity of a pill's outline."),
    textBaseline: _length(
      "Pill text baseline",
      "Distance from a pill's top to its text baseline.",
    ),
  },
  Check: {
    color: _color(
      "Check colour",
      "Colour of a check mark that names no colour of its own.",
    ),
    size: _length(
      "Check size",
      "Size of a check mark that names no size of its own.",
    ),
    strokeWidth: _stroke("Check width", "Stroke width of a check mark."),
    cap: _enum("Check cap", "How a check mark's ends are drawn.", CAPS),
    join: _enum("Check join", "How a check mark's corner is drawn.", JOINS),
  },
  Rule: {
    color: _color("Rule colour", "Colour of a divider rule."),
    strokeWidth: _stroke("Rule width", "Width of a divider rule."),
  },
  Glyph: {
    strokeWidth: _stroke(
      "Glyph width",
      "Stroke width of icon glyphs drawn inside shapes.",
    ),
  },
} as const;

/**
 * Component tokens: `components.<Name>.defaultProps` in a theme, read by
 * themed shapes through Mantine `useProps` (via `useVideoProps`). A value is
 * a reference or a deliberate literal one-off. Plan 2 adds one entry per
 * themed shape as each renderer adopts tokens.
 */
export const COMPONENT_TOKENS = {
  ...SHARED_GRAPHIC_TOKENS,
  ProgressBar: {
    height: token({
      kind: "length",
      surface: "stage",
      unit: "px",
      min: 1,
      max: 16,
      step: 1,
      label: "Progress bar height",
      description:
        "Thickness of the beat progress bar along the bottom of the stage.",
    }),
    paint: token({
      kind: "paint",
      surface: "stage",
      label: "Progress bar colour",
      description: "Colour and opacity of the beat progress bar.",
    }),
  },
} as const;
