import { TokenDefinitions } from "../TokenDefinitions";
import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";

const CAPS = ["butt", "round", "square"] as const;
const NODE_TOKENS = {
  radiusXs: ComponentTokenDefinitions.makeLengthToken({
    label: "Extra-small node radius",
    description:
      "Radius of the smallest nodes, such as the spokes of a radial network.",
  }),
  radiusSm: ComponentTokenDefinitions.makeLengthToken({
    label: "Small node radius",
    description:
      "Radius of small nodes, such as the outer nodes of a network graph.",
  }),
  radiusMd: ComponentTokenDefinitions.makeLengthToken({
    label: "Node radius",
    description: "Radius of a standard node.",
  }),
  radiusLg: ComponentTokenDefinitions.makeLengthToken({
    label: "Large node radius",
    description: "Radius of large nodes, such as the stops of a traversal.",
  }),
  radiusXl: ComponentTokenDefinitions.makeLengthToken({
    label: "Hub node radius",
    description: "Radius of a hub node at the centre of a network.",
  }),
  fill: ComponentTokenDefinitions.makeColorToken({
    label: "Node fill",
    description: "Fill behind a node's tint.",
  }),
  stroke: ComponentTokenDefinitions.makeColorToken({
    label: "Node outline colour",
    description: "Colour of a node's resting outline.",
  }),
  strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Node outline width",
    description: "Width of a node's outlines.",
  }),
  ringSpread: ComponentTokenDefinitions.makeLengthToken({
    label: "Node ring spread",
    description: "How far the active ring sits outside a node.",
  }),
  ringAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Node ring opacity",
    description: "Opacity of the active ring at full activity.",
  }),
  tintAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Node tint opacity",
    description: "Opacity of the accent tint inside a node at full activity.",
  }),
  outlineAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Node accent outline opacity",
    description:
      "Opacity of the accent outline at rest; it rises to full as the node activates.",
  }),
  coreRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Node core radius",
    description: "Radius of the dot at a node's centre at rest.",
  }),
  coreGrowth: ComponentTokenDefinitions.makeLengthToken({
    label: "Node core growth",
    description: "How much the centre dot grows at full activity.",
  }),
  labelOffset: ComponentTokenDefinitions.makeOffsetToken({
    label: "Node label offset",
    description: "Distance from a node's edge to its label baseline.",
  }),
  detailOffset: ComponentTokenDefinitions.makeOffsetToken({
    label: "Node detail offset",
    description: "Distance from a node's edge to its detail baseline.",
  }),
  sketch: ComponentTokenDefinitions.makeSketchToken({
    label: "Node sketch",
    description: "The sketch profile node outlines use.",
  }),
} as const;
/**
 * Tokens of the parts shared by many graphics: nodes, edges, routes, packets,
 * panels, cards, and more.
 */
export const SHARED_GRAPHIC_TOKENS = {
  Node: NODE_TOKENS,
  Edge: {
    color: ComponentTokenDefinitions.makeColorToken({
      label: "Edge colour",
      description: "Colour of an edge that names no colour of its own.",
    }),
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Edge width",
      description: "Width of edges and drawn paths.",
    }),
    cap: ComponentTokenDefinitions.makeEnumToken({
      label: "Edge cap",
      description: "How edge ends are drawn.",
      options: CAPS,
    }),
    dash: ComponentTokenDefinitions.makeDashToken({
      label: "Edge dash",
      description:
        "Dash pattern of dashed edges, in fractions of the path length.",
    }),
    drawDuration: ComponentTokenDefinitions.makeDurationToken({
      label: "Edge draw duration",
      description: "How long an edge takes to draw itself in.",
    }),
    drawEasing: ComponentTokenDefinitions.makeEasingToken({
      label: "Edge draw curve",
      description: "The curve of an edge drawing itself in.",
    }),
    curveTension: ComponentTokenDefinitions.makeNumberToken({
      label: "Edge curve tension",
      description: "Where a curved edge places its control points.",
      range: { min: 0, max: 1, step: 0.01 },
    }),
    sketch: ComponentTokenDefinitions.makeSketchToken({
      label: "Edge sketch",
      description: "The sketch profile edges use.",
    }),
  },
  Route: {
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Route width",
      description: "Width of a highlighted route.",
    }),
    cap: ComponentTokenDefinitions.makeEnumToken({
      label: "Route cap",
      description: "How route ends are drawn.",
      options: CAPS,
    }),
    fadeIn: ComponentTokenDefinitions.makeDurationToken({
      label: "Route fade-in",
      description: "How long a route takes to appear.",
    }),
  },
  Packet: {
    radius: ComponentTokenDefinitions.makeLengthToken({
      label: "Packet radius",
      description: "Radius of a packet.",
    }),
    radiusSm: ComponentTokenDefinitions.makeLengthToken({
      label: "Small packet radius",
      description: "Radius of a packet on a secondary edge.",
    }),
    period: ComponentTokenDefinitions.makeDurationToken({
      label: "Packet period",
      description: "Frames for a packet to travel its edge once.",
    }),
    curveTension: ComponentTokenDefinitions.makeNumberToken({
      label: "Packet curve tension",
      description: "Where a packet's curved path places its control points.",
      range: { min: 0, max: 1, step: 0.01 },
    }),
    fadeIn: ComponentTokenDefinitions.makeDurationToken({
      label: "Packet fade-in",
      description: "How long packets take to appear.",
    }),
  },
  Halo: {
    glow: TokenDefinitions.token({
      kind: "glow",
      surface: "graphic",
      label: "Halo glow",
      description: "The soft disc around a packet.",
    }),
  },
  Particle: {
    radius: ComponentTokenDefinitions.makeLengthToken({
      label: "Particle radius",
      description: "Radius of an ambient particle.",
    }),
    radiusLg: ComponentTokenDefinitions.makeLengthToken({
      label: "Large particle radius",
      description: "Radius of an emphasised particle.",
    }),
    haloRadius: ComponentTokenDefinitions.makeLengthToken({
      label: "Particle halo radius",
      description: "Radius of the halo around an emphasised particle.",
    }),
    haloAlpha: ComponentTokenDefinitions.makeAlphaToken({
      label: "Particle halo opacity",
      description: "Opacity of the halo around an emphasised particle.",
    }),
    twinklePeriod: ComponentTokenDefinitions.makeDurationToken({
      label: "Particle twinkle period",
      description: "Frames for one particle twinkle cycle.",
    }),
    twinkleFloor: ComponentTokenDefinitions.makeAlphaToken({
      label: "Particle twinkle floor",
      description: "The lowest opacity a twinkling particle reaches.",
    }),
  },
  Guide: {
    color: ComponentTokenDefinitions.makeColorToken({
      label: "Guide colour",
      description: "Colour of orbit guides and construction lines.",
    }),
    alpha: ComponentTokenDefinitions.makeAlphaToken({
      label: "Guide opacity",
      description: "Opacity of guides.",
    }),
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Guide width",
      description: "Width of dashed guides.",
    }),
    dash: ComponentTokenDefinitions.makeDashToken({
      label: "Guide dash",
      description: "Dash pattern of guides, in pixels.",
    }),
    sketch: ComponentTokenDefinitions.makeSketchToken({
      label: "Guide sketch",
      description: "The sketch profile guides use.",
    }),
  },
  Panel: {
    fill: ComponentTokenDefinitions.makeColorToken({
      label: "Panel fill",
      description: "Fill of a panel.",
    }),
    stroke: ComponentTokenDefinitions.makeColorToken({
      label: "Panel outline colour",
      description: "Outline colour of a panel.",
    }),
    radius: ComponentTokenDefinitions.makeLengthToken({
      label: "Panel radius",
      description: "Corner radius of a panel.",
    }),
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Panel outline width",
      description: "Outline width of a panel.",
    }),
    elevation: TokenDefinitions.token({
      kind: "elevation",
      surface: "graphic",
      label: "Panel elevation",
      description: "The shadow under a panel. Flat panels cast none.",
    }),
  },
  Card: {
    radius: ComponentTokenDefinitions.makeLengthToken({
      label: "Card radius",
      description: "Corner radius of a tinted summary card.",
    }),
    fillAlpha: ComponentTokenDefinitions.makeAlphaToken({
      label: "Card fill opacity",
      description: "Opacity of a card's tint.",
    }),
    strokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
      label: "Card outline opacity",
      description: "Opacity of a card's outline.",
    }),
    padding: ComponentTokenDefinitions.makeLengthToken({
      label: "Card padding",
      description: "Space between a card's edge and its text.",
    }),
    textBaseline: ComponentTokenDefinitions.makeLengthToken({
      label: "Card text baseline",
      description: "Distance from a card's top to its first text baseline.",
    }),
    baseHeight: ComponentTokenDefinitions.makeLengthToken({
      label: "Card base height",
      description: "A card's height before its text lines are added.",
    }),
  },
  Pill: {
    height: ComponentTokenDefinitions.makeLengthToken({
      label: "Pill height",
      description: "Height of a pill.",
    }),
    radius: ComponentTokenDefinitions.makeLengthToken({
      label: "Pill radius",
      description: "Corner radius of a pill, limited to half its height.",
    }),
    fillAlpha: ComponentTokenDefinitions.makeAlphaToken({
      label: "Pill fill opacity",
      description: "Opacity of a pill's tint.",
    }),
    strokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
      label: "Pill outline opacity",
      description: "Opacity of a pill's outline.",
    }),
    textBaseline: ComponentTokenDefinitions.makeLengthToken({
      label: "Pill text baseline",
      description: "Distance from a pill's top to its text baseline.",
    }),
  },
  Check: {
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Check width",
      description: "Stroke width of a check mark.",
    }),
    cap: ComponentTokenDefinitions.makeEnumToken({
      label: "Check cap",
      description: "How a check mark's ends are drawn.",
      options: CAPS,
    }),
    join: ComponentTokenDefinitions.makeEnumToken({
      label: "Check join",
      description: "How a check mark's corner is drawn.",
      options: ["miter", "round", "bevel"],
    }),
  },
  Rule: {
    color: ComponentTokenDefinitions.makeColorToken({
      label: "Rule colour",
      description: "Colour of a divider rule.",
    }),
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Rule width",
      description: "Width of a divider rule.",
    }),
  },
  Glyph: {
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Glyph width",
      description: "Stroke width of icon glyphs drawn inside shapes.",
    }),
  },
} as const;
