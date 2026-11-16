import { token } from "../defineTokensHelpers";
import {
  createAlphaToken,
  createColorToken,
  createDashToken,
  createDurationToken,
  createEasingToken,
  createEnumToken,
  createLengthToken,
  createNumberToken,
  createOffsetToken,
  createSketchToken,
  createStrokeToken,
} from "./componentTokenHelpers";

const CAPS = ["butt", "round", "square"] as const;

const NODE_TOKENS = {
  radiusXs: createLengthToken(
    "Extra-small node radius",
    "Radius of the smallest nodes, such as the spokes of a radial network.",
  ),
  radiusSm: createLengthToken(
    "Small node radius",
    "Radius of small nodes, such as the outer nodes of a network graph.",
  ),
  radiusMd: createLengthToken("Node radius", "Radius of a standard node."),
  radiusLg: createLengthToken(
    "Large node radius",
    "Radius of large nodes, such as the stops of a traversal.",
  ),
  radiusXl: createLengthToken(
    "Hub node radius",
    "Radius of a hub node at the centre of a network.",
  ),
  fill: createColorToken("Node fill", "Fill behind a node's tint."),
  stroke: createColorToken(
    "Node outline colour",
    "Colour of a node's resting outline.",
  ),
  strokeWidth: createStrokeToken(
    "Node outline width",
    "Width of a node's outlines.",
  ),
  ringSpread: createLengthToken(
    "Node ring spread",
    "How far the active ring sits outside a node.",
  ),
  ringAlpha: createAlphaToken(
    "Node ring opacity",
    "Opacity of the active ring at full activity.",
  ),
  tintAlpha: createAlphaToken(
    "Node tint opacity",
    "Opacity of the accent tint inside a node at full activity.",
  ),
  outlineAlpha: createAlphaToken(
    "Node accent outline opacity",
    "Opacity of the accent outline at rest; it rises to full as the node activates.",
  ),
  coreRadius: createLengthToken(
    "Node core radius",
    "Radius of the dot at a node's centre at rest.",
  ),
  coreGrowth: createLengthToken(
    "Node core growth",
    "How much the centre dot grows at full activity.",
  ),
  labelOffset: createOffsetToken(
    "Node label offset",
    "Distance from a node's edge to its label baseline.",
  ),
  detailOffset: createOffsetToken(
    "Node detail offset",
    "Distance from a node's edge to its detail baseline.",
  ),
  sketch: createSketchToken(
    "Node sketch",
    "The sketch profile node outlines use.",
  ),
} as const;

/** Tokens of the parts shared by many graphics: nodes, edges, routes, packets, panels, cards, and more. */
export const SHARED_GRAPHIC_TOKENS = {
  Node: NODE_TOKENS,
  Edge: {
    color: createColorToken(
      "Edge colour",
      "Colour of an edge that names no colour of its own.",
    ),
    strokeWidth: createStrokeToken(
      "Edge width",
      "Width of edges and drawn paths.",
    ),
    cap: createEnumToken("Edge cap", "How edge ends are drawn.", CAPS),
    dash: createDashToken(
      "Edge dash",
      "Dash pattern of dashed edges, in fractions of the path length.",
    ),
    drawDuration: createDurationToken(
      "Edge draw duration",
      "How long an edge takes to draw itself in.",
    ),
    drawEasing: createEasingToken(
      "Edge draw curve",
      "The curve of an edge drawing itself in.",
    ),
    curveTension: createNumberToken(
      "Edge curve tension",
      "Where a curved edge places its control points.",
      { min: 0, max: 1, step: 0.01 },
    ),
    sketch: createSketchToken("Edge sketch", "The sketch profile edges use."),
  },
  Route: {
    strokeWidth: createStrokeToken(
      "Route width",
      "Width of a highlighted route.",
    ),
    cap: createEnumToken("Route cap", "How route ends are drawn.", CAPS),
    fadeIn: createDurationToken(
      "Route fade-in",
      "How long a route takes to appear.",
    ),
  },
  Packet: {
    radius: createLengthToken("Packet radius", "Radius of a packet."),
    radiusSm: createLengthToken(
      "Small packet radius",
      "Radius of a packet on a secondary edge.",
    ),
    period: createDurationToken(
      "Packet period",
      "Frames for a packet to travel its edge once.",
    ),
    curveTension: createNumberToken(
      "Packet curve tension",
      "Where a packet's curved path places its control points.",
      { min: 0, max: 1, step: 0.01 },
    ),
    fadeIn: createDurationToken(
      "Packet fade-in",
      "How long packets take to appear.",
    ),
  },
  Halo: {
    glow: token({
      kind: "glow",
      surface: "graphic",
      label: "Halo glow",
      description: "The soft disc around a packet.",
    }),
  },
  Particle: {
    radius: createLengthToken(
      "Particle radius",
      "Radius of an ambient particle.",
    ),
    radiusLg: createLengthToken(
      "Large particle radius",
      "Radius of an emphasised particle.",
    ),
    haloRadius: createLengthToken(
      "Particle halo radius",
      "Radius of the halo around an emphasised particle.",
    ),
    haloAlpha: createAlphaToken(
      "Particle halo opacity",
      "Opacity of the halo around an emphasised particle.",
    ),
    twinklePeriod: createDurationToken(
      "Particle twinkle period",
      "Frames for one particle twinkle cycle.",
    ),
    twinkleFloor: createAlphaToken(
      "Particle twinkle floor",
      "The lowest opacity a twinkling particle reaches.",
    ),
  },
  Guide: {
    color: createColorToken(
      "Guide colour",
      "Colour of orbit guides and construction lines.",
    ),
    alpha: createAlphaToken("Guide opacity", "Opacity of guides."),
    strokeWidth: createStrokeToken("Guide width", "Width of dashed guides."),
    dash: createDashToken("Guide dash", "Dash pattern of guides, in pixels."),
    sketch: createSketchToken("Guide sketch", "The sketch profile guides use."),
  },
  Panel: {
    fill: createColorToken("Panel fill", "Fill of a panel."),
    stroke: createColorToken(
      "Panel outline colour",
      "Outline colour of a panel.",
    ),
    radius: createLengthToken("Panel radius", "Corner radius of a panel."),
    strokeWidth: createStrokeToken(
      "Panel outline width",
      "Outline width of a panel.",
    ),
    elevation: token({
      kind: "elevation",
      surface: "graphic",
      label: "Panel elevation",
      description: "The shadow under a panel. Flat panels cast none.",
    }),
  },
  Card: {
    radius: createLengthToken(
      "Card radius",
      "Corner radius of a tinted summary card.",
    ),
    fillAlpha: createAlphaToken(
      "Card fill opacity",
      "Opacity of a card's tint.",
    ),
    strokeAlpha: createAlphaToken(
      "Card outline opacity",
      "Opacity of a card's outline.",
    ),
    padding: createLengthToken(
      "Card padding",
      "Space between a card's edge and its text.",
    ),
    textBaseline: createLengthToken(
      "Card text baseline",
      "Distance from a card's top to its first text baseline.",
    ),
    baseHeight: createLengthToken(
      "Card base height",
      "A card's height before its text lines are added.",
    ),
  },
  Pill: {
    height: createLengthToken("Pill height", "Height of a pill."),
    radius: createLengthToken(
      "Pill radius",
      "Corner radius of a pill, limited to half its height.",
    ),
    fillAlpha: createAlphaToken(
      "Pill fill opacity",
      "Opacity of a pill's tint.",
    ),
    strokeAlpha: createAlphaToken(
      "Pill outline opacity",
      "Opacity of a pill's outline.",
    ),
    textBaseline: createLengthToken(
      "Pill text baseline",
      "Distance from a pill's top to its text baseline.",
    ),
  },
  Check: {
    strokeWidth: createStrokeToken(
      "Check width",
      "Stroke width of a check mark.",
    ),
    cap: createEnumToken(
      "Check cap",
      "How a check mark's ends are drawn.",
      CAPS,
    ),
    join: createEnumToken("Check join", "How a check mark's corner is drawn.", [
      "miter",
      "round",
      "bevel",
    ]),
  },
  Rule: {
    color: createColorToken("Rule colour", "Colour of a divider rule."),
    strokeWidth: createStrokeToken("Rule width", "Width of a divider rule."),
  },
  Glyph: {
    strokeWidth: createStrokeToken(
      "Glyph width",
      "Stroke width of icon glyphs drawn inside shapes.",
    ),
  },
} as const;
