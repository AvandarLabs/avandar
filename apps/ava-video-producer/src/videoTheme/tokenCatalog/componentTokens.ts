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
function _elevation(label: string, description: string) {
  return token({ kind: "elevation", surface: "graphic", label, description });
}
function _sketch(label: string, description: string) {
  return token({
    kind: "sketchProfile",
    surface: "graphic",
    label,
    description,
  });
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
  sketch: _sketch("Node sketch", "The sketch profile node outlines use."),
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
    sketch: _sketch("Edge sketch", "The sketch profile edges use."),
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
    sketch: _sketch("Guide sketch", "The sketch profile guides use."),
  },
  Panel: {
    fill: _color("Panel fill", "Fill of a panel."),
    stroke: _color("Panel outline colour", "Outline colour of a panel."),
    radius: _length("Panel radius", "Corner radius of a panel."),
    strokeWidth: _stroke("Panel outline width", "Outline width of a panel."),
    elevation: _elevation(
      "Panel elevation",
      "The shadow under a panel. Flat panels cast none.",
    ),
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

const NETWORK_GRAPH_TOKENS = {
  highlightEdgeAlpha: _alpha(
    "Highlighted edge opacity",
    "Opacity of the first edges of a network graph, drawn in the accent.",
  ),
  edgeAlpha: _alpha(
    "Network edge opacity",
    "Opacity of the remaining edges of a network graph.",
  ),
  hubPulsePeriod: _duration(
    "Hub pulse period",
    "Frames for one breath of the hub node.",
  ),
  hubPulseFloor: _alpha(
    "Hub pulse floor",
    "The hub's lowest activity while it breathes.",
  ),
  hubPulseSwing: _alpha(
    "Hub pulse swing",
    "How far the hub's activity rises above its floor.",
  ),
  nodePulsePeriod: _duration(
    "Outer node pulse period",
    "Frames for one breath of an outer node.",
  ),
  nodePulseSwing: _alpha(
    "Outer node pulse swing",
    "How high an outer node's activity rises at the top of a breath.",
  ),
} as const;

const PLEXUS_FIELD_TOKENS = {
  linkDistance: _length(
    "Link distance",
    "Particles closer than this are joined by a line.",
  ),
  linkAlpha: _alpha(
    "Link opacity",
    "Opacity of a link between touching particles; it fades out with distance.",
  ),
  linkWidth: _stroke("Link width", "Width of a link between particles."),
} as const;

const ORBITAL_SYSTEM_TOKENS = {
  orbitAlpha: _alpha("Orbit opacity", "Opacity of an orbit's path."),
  orbitWidth: _stroke("Orbit width", "Width of an orbit's path."),
  bodyRadius: _length("Body radius", "Radius of an orbiting body's shell."),
  bodyCoreRadius: _length(
    "Body core radius",
    "Radius of the dot inside an orbiting body.",
  ),
  bodyAlpha: _alpha("Body rim opacity", "Opacity of an orbiting body's rim."),
  bodyStrokeWidth: _stroke(
    "Body rim width",
    "Width of an orbiting body's rim.",
  ),
  bodyLabelOffset: _length(
    "Body label offset",
    "Distance from a body's centre up to its label baseline.",
  ),
  coreRadius: _length("Core radius", "Radius of the central core."),
  coreStrokeAlpha: _alpha(
    "Core rim opacity",
    "Opacity of the central core's accent rim.",
  ),
  coreStrokeWidth: _stroke(
    "Core rim width",
    "Width of the central core's accent rim.",
  ),
  pulsePeriod: _duration(
    "Core pulse period",
    "Frames for one breath of the glow around the core.",
  ),
  pulseRadius: _length(
    "Core pulse radius",
    "Radius of the glow around the core at rest.",
  ),
  pulseSwing: _length(
    "Core pulse swing",
    "How far the glow around the core grows at the top of a breath.",
  ),
  pulseAlpha: _alpha(
    "Core pulse opacity",
    "Opacity of the glow around the core.",
  ),
  pulseStrokeAlpha: _alpha(
    "Core pulse rim opacity",
    "Opacity of the glow's rim.",
  ),
  pulseStrokeWidth: _stroke("Core pulse rim width", "Width of the glow's rim."),
} as const;

const RADIAL_NETWORK_TOKENS = {
  spokeAlpha: _alpha(
    "Spoke opacity",
    "Opacity of the spokes from the hub to each node.",
  ),
  spokePulsePeriod: _duration(
    "Spoke node pulse period",
    "Frames for one breath of a spoke node.",
  ),
  spokePulseSwing: _alpha(
    "Spoke node pulse swing",
    "How high a spoke node's activity rises at the top of a breath.",
  ),
  hubRadius: _length(
    "Hub radius",
    "Radius of the hub disc at the centre of a radial network.",
  ),
  hubStrokeAlpha: _alpha("Hub rim opacity", "Opacity of the hub's accent rim."),
  hubStrokeWidth: _stroke("Hub rim width", "Width of the hub's accent rim."),
  hubGlowRadius: _length(
    "Hub glow radius",
    "Radius of the soft glow inside the hub.",
  ),
  hubGlowAlpha: _alpha(
    "Hub glow opacity",
    "Opacity of the soft glow inside the hub.",
  ),
  hubLabelOffset: _offset(
    "Hub label offset",
    "Vertical distance from the hub centre to its label baseline.",
  ),
  hubDetailOffset: _offset(
    "Hub detail offset",
    "Vertical distance from the hub centre to its detail baseline.",
  ),
} as const;

const DATA_PIPELINE_TOKENS = {
  activeTintAlpha: _alpha(
    "Active stage tint",
    "Opacity of the accent tint on a completed stage.",
  ),
  activeStrokeAlpha: _alpha(
    "Active stage outline",
    "Opacity of the accent outline on a completed stage.",
  ),
  activeStrokeWidth: _stroke(
    "Active stage outline width",
    "Width of the accent outline on a completed stage.",
  ),
  iconRadius: _length(
    "Stage icon radius",
    "Radius of the disc behind a stage's check.",
  ),
  iconFillAlpha: _alpha(
    "Stage icon fill",
    "Opacity of the disc behind a stage's check.",
  ),
  iconStrokeAlpha: _alpha(
    "Stage icon rim",
    "Opacity of the rim of the disc behind a stage's check.",
  ),
  iconStrokeWidth: _stroke(
    "Stage icon rim width",
    "Width of the rim of the disc behind a stage's check.",
  ),
  checkSize: _length(
    "Stage check size",
    "Size of the check on a completed stage.",
  ),
  dotRadius: _length(
    "Stage dot radius",
    "Radius of the dot on a stage that has not finished.",
  ),
  trackHeight: _length(
    "Progress track height",
    "Thickness of the pipeline's progress track.",
  ),
  packetPeriod: _duration(
    "Pipeline packet period",
    "Frames for a packet to cross between two stages.",
  ),
} as const;

const PREDICATE_PUSHDOWN_TOKENS = {
  boundaryWidth: _stroke(
    "Boundary width",
    "Width of the dashed transfer boundary.",
  ),
  boundaryDash: _dash(
    "Boundary dash",
    "Dash pattern of the transfer boundary, in pixels.",
  ),
  predicateRadius: _length(
    "Predicate card radius",
    "Corner radius of the predicate card.",
  ),
  predicateStrokeWidth: _stroke(
    "Predicate card outline width",
    "Width of the predicate card's accent outline.",
  ),
  rowRadius: _length("Row radius", "Corner radius of a data row."),
  rowStrokeWidth: _stroke(
    "Row outline width",
    "Width of a data row's outline.",
  ),
  gateWidth: _stroke(
    "Gate width",
    "Width of the gate that stops a row at the source.",
  ),
} as const;

const CODE_WINDOW_TOKENS = {
  radius: _length("Code window radius", "Corner radius of the editor window."),
  dividerWidth: _stroke(
    "Code window divider width",
    "Width of the line under the window's title bar.",
  ),
  dotRadius: _length(
    "Window dot radius",
    "Radius of the three dots in the title bar.",
  ),
  dotAlpha: _alpha(
    "Window dot opacity",
    "Opacity of the three dots in the title bar.",
  ),
} as const;

const CODE_FOCUS_TOKENS = {
  highlightRadius: _length(
    "Line highlight radius",
    "Corner radius of the highlight behind the focused line.",
  ),
  highlightAlpha: _alpha(
    "Line highlight opacity",
    "Opacity of the highlight behind the focused line.",
  ),
  markerWidth: _length(
    "Line marker width",
    "Width of the accent bar beside the focused line.",
  ),
  dividerWidth: _stroke(
    "Footer divider width",
    "Width of the line above the window's footer.",
  ),
  footerDotRadius: _length(
    "Footer dot radius",
    "Radius of the accent dot in the footer.",
  ),
} as const;

const SCHEMA_MAPPING_TOKENS = {
  fieldRadius: _length("Field row radius", "Corner radius of a field row."),
  dividerWidth: _stroke(
    "Panel divider width",
    "Width of the line under a panel title.",
  ),
  dotRadius: _length(
    "Field port radius",
    "Radius of the dot where a mapping leaves or enters a field.",
  ),
  edgeAlpha: _alpha(
    "Mapping opacity",
    "Opacity of a mapping line between two fields.",
  ),
  ringRadius: _length(
    "Match ring radius",
    "Radius of the ring that confirms a mapping.",
  ),
  ringAlpha: _alpha(
    "Match ring opacity",
    "Opacity of the confirming ring's outline.",
  ),
  ringStrokeWidth: _stroke(
    "Match ring width",
    "Width of the confirming ring's outline.",
  ),
  checkSize: _length(
    "Match check size",
    "Size of the check inside the confirming ring.",
  ),
} as const;

const QUERY_CACHE_TOKENS = {
  tableRadius: _length(
    "Cache table radius",
    "Corner radius of the cached relation.",
  ),
  tableStrokeWidth: _stroke(
    "Cache table outline width",
    "Width of the cached relation's outline.",
  ),
  gridStrokeWidth: _stroke(
    "Cache grid width",
    "Width of the row and column lines inside the cached relation.",
  ),
  missingDash: _dash(
    "Missing column dash",
    "Dash pattern of a column the cache does not hold yet.",
  ),
  missingStrokeWidth: _stroke(
    "Missing column outline width",
    "Width of a missing column's dashed outline.",
  ),
  cardRadius: _length(
    "Request card radius",
    "Corner radius of a query request card.",
  ),
  cardStrokeWidth: _stroke(
    "Request card outline width",
    "Width of a request card's outline.",
  ),
  checkWidth: _stroke(
    "Covered check width",
    "Width of the check on a request the cache covers.",
  ),
  routeStrokeWidth: _stroke(
    "Request route width",
    "Width of the routes from a request to its columns.",
  ),
  portRadius: _length(
    "Column port radius",
    "Radius of the ring where a request route meets a column.",
  ),
} as const;

const SOURCE_MERGE_TOKENS = {
  edgeAlpha: _alpha(
    "Source edge opacity",
    "Opacity of an edge from a source to the merge.",
  ),
  chipRadius: _length(
    "Source chip radius",
    "Corner radius of a source's kind chip.",
  ),
  chipFillAlpha: _alpha("Source chip fill", "Opacity of a source chip's tint."),
  chipStrokeAlpha: _alpha(
    "Source chip outline",
    "Opacity of a source chip's outline.",
  ),
  chipStrokeWidth: _stroke(
    "Source chip outline width",
    "Width of a source chip's outline.",
  ),
  outEdgeAlpha: _alpha(
    "Output edge opacity",
    "Opacity of the edge from the merge to the destination.",
  ),
  outEdgeWidth: _stroke(
    "Output edge width",
    "Width of the edge from the merge to the destination.",
  ),
  outPacketPeriod: _duration(
    "Output packet period",
    "Frames for a packet to cross from the merge to the destination.",
  ),
  mergeRadius: _length("Merge node radius", "Radius of the merge node."),
  mergeStrokeAlpha: _alpha(
    "Merge node rim opacity",
    "Opacity of the merge node's accent rim.",
  ),
  mergeStrokeWidth: _stroke(
    "Merge node rim width",
    "Width of the merge node's accent rim.",
  ),
  glyphWidth: _stroke("Merge glyph width", "Stroke width of the merge glyph."),
  barHeight: _length(
    "Destination bar height",
    "Thickness of the accent bar on the destination panel.",
  ),
  barAlpha: _alpha(
    "Destination bar opacity",
    "Opacity of the accent bar on the destination panel.",
  ),
  slotRadius: _length(
    "Destination slot radius",
    "Corner radius of a slot on the destination panel.",
  ),
  slotFillAlpha: _alpha(
    "Destination slot fill",
    "Opacity of a destination slot's tint.",
  ),
  slotStrokeAlpha: _alpha(
    "Destination slot line opacity",
    "Opacity of the line inside a destination slot.",
  ),
  slotStrokeWidth: _stroke(
    "Destination slot line width",
    "Width of the line inside a destination slot.",
  ),
} as const;

const DECISION_FORK_TOKENS = {
  selectedWidth: _stroke(
    "Chosen path width",
    "Width of the accent path along the chosen branch.",
  ),
  conditionRadius: _length(
    "Condition box radius",
    "Corner radius of a branch's condition box.",
  ),
  conditionStrokeWidth: _stroke(
    "Condition outline width",
    "Width of the accent outline on the chosen condition.",
  ),
  outcomeRadius: _length(
    "Outcome box radius",
    "Corner radius of a branch's outcome box.",
  ),
  outcomeStrokeWidth: _stroke(
    "Outcome outline width",
    "Width of an outcome box's outline.",
  ),
  gateWidth: _stroke(
    "Gate width",
    "Width of the cross that closes an untaken branch.",
  ),
  gateSpread: _length(
    "Gate spread",
    "Half the width of the cross that closes an untaken branch.",
  ),
  markerRadius: _length(
    "Marker halo radius",
    "Radius of the halo around the scenario marker.",
  ),
  markerAlpha: _alpha(
    "Marker halo opacity",
    "Opacity of the halo around the scenario marker.",
  ),
  markerCoreRadius: _length("Marker radius", "Radius of the scenario marker."),
  lineGap: _length(
    "Label line gap",
    "Space added between wrapped lines of a decision label.",
  ),
} as const;

const STAGE_TOKENS = {
  Heading: {
    entranceDuration: _duration(
      "Heading entrance duration",
      "How long a beat heading takes to arrive.",
      "stage",
    ),
    entranceEasing: _easing(
      "Heading entrance curve",
      "The curve of a beat heading arriving.",
      "stage",
    ),
    entranceDistance: _length(
      "Heading rise",
      "How far a beat heading rises as it arrives.",
      "stage",
    ),
  },
  Subtitle: {
    gap: _length(
      "Subtitle gap",
      "Space between a beat heading and its subtitle.",
      "stage",
    ),
  },
  SharedObject: {
    borderWidth: _stroke(
      "Shared object border",
      "Border width of an object that travels between motions.",
      "stage",
    ),
    fill: _color(
      "Shared object fill",
      "Fill of an object that travels between motions.",
      "stage",
    ),
    fadeIn: _duration(
      "Shared object fade-in",
      "How long a shared object takes to appear.",
      "stage",
    ),
    outlineFade: _duration(
      "Outline fade",
      "How long an outline-only shared object takes to fade after it lands.",
      "stage",
    ),
  },
  EvidenceChip: {
    padding: token({
      kind: "box",
      surface: "stage",
      label: "Evidence chip padding",
      description:
        "Space inside an evidence chip: x on the sides and y above and below.",
    }),
  },
  ProductFrame: {
    backdrop: _color(
      "Reenactment backdrop",
      "The backdrop drawn around a reenactment on the stage.",
      "stage",
    ),
  },
} as const;

const OVERLAY_TOKENS = {
  Thesis: {
    gap: _length("Thesis line gap", "Space between thesis lines.", "stage"),
    inset: token({
      kind: "box",
      surface: "stage",
      label: "Thesis inset",
      description:
        "Where the thesis block sits: top, x from both sides, and bottom.",
    }),
    emphasisGap: _length(
      "Thesis emphasis gap",
      "Space above the thesis's supporting line.",
      "stage",
    ),
    lineStagger: token({
      kind: "number",
      surface: "stage",
      unit: "frames",
      min: 0,
      max: 60,
      step: 1,
      label: "Thesis line stagger",
      description: "Frames between thesis lines starting to arrive.",
    }),
    lineDuration: _duration(
      "Thesis line duration",
      "How long a thesis line takes to arrive.",
      "stage",
    ),
    lineEasing: _easing(
      "Thesis line curve",
      "The curve of a thesis line arriving.",
      "stage",
    ),
    lineDistance: _length(
      "Thesis line rise",
      "How far a thesis line rises as it arrives.",
      "stage",
    ),
  },
  Underline: {
    strokeWidth: _stroke(
      "Underline width",
      "Width of the hand-drawn teaching underline.",
      "stage",
    ),
    seed: token({
      kind: "number",
      surface: "stage",
      min: 0,
      max: 9999,
      step: 1,
      label: "Underline seed",
      description:
        "Fixes the wobble of the teaching underline so every frame draws the same line.",
    }),
    drawIn: _duration(
      "Underline draw-in",
      "How long the teaching underline takes to draw.",
      "stage",
    ),
  },
  Annotation: {
    strokeWidth: _stroke(
      "Annotation width",
      "Width of hand-drawn boxes, brackets, and circles on the product stage.",
      "stage",
    ),
    highlightAlpha: _alpha(
      "Highlight opacity",
      "Opacity of a hand-drawn highlight on the product stage.",
      "stage",
    ),
    drawIn: _duration(
      "Annotation draw-in",
      "How long a hand-drawn mark takes to draw and to retract.",
      "stage",
    ),
  },
  Spotlight: {
    padding: _length(
      "Spotlight padding",
      "Space between a spotlit region and the edge of its cut-out.",
      "stage",
    ),
    scrimSpread: token({
      kind: "length",
      surface: "stage",
      unit: "px",
      min: 0,
      max: 4000,
      step: 10,
      label: "Scrim spread",
      description:
        "How far the scrim around a spotlight extends. It must reach past every stage edge.",
    }),
  },
  Connector: {
    strokeWidth: _stroke(
      "Connector width",
      "Width of the dashed connector from a source to its explanation.",
      "stage",
    ),
    dash: token({
      kind: "dash",
      surface: "stage",
      label: "Connector dash",
      description: "Dash pattern of a connector, in pixels.",
    }),
    bend: _offset(
      "Connector bend",
      "How far past its target a connector's end swings sideways.",
      "stage",
    ),
    drop: _offset(
      "Connector drop",
      "How far below its target a connector ends.",
      "stage",
    ),
    drawIn: _duration(
      "Connector draw-in",
      "How long a connector takes to draw.",
      "stage",
    ),
    easing: _easing(
      "Connector curve",
      "The curve of a connector drawing in.",
      "stage",
    ),
  },
  FloatingLabel: {
    padding: token({
      kind: "box",
      surface: "stage",
      label: "Floating label padding",
      description:
        "Space inside a floating label: x on the sides and y above and below.",
    }),
    offset: _length(
      "Floating label offset",
      "Space between a floating label and the artwork it names.",
      "stage",
    ),
    borderWidth: _stroke(
      "Floating label border",
      "Border width of a floating label.",
      "stage",
    ),
  },
  FloatingDiagram: {
    elevation: token({
      kind: "elevation",
      surface: "stage",
      label: "Floating diagram elevation",
      description: "The shadow under artwork lifted off the product stage.",
    }),
  },
} as const;

const TRANSITION_TOKENS = {
  Morph: {
    startRadius: _length(
      "Morph start radius",
      "Corner radius a morph transition starts from before it opens to the full frame.",
      "stage",
    ),
  },
  Aperture: {
    overscan: token({
      kind: "number",
      surface: "stage",
      unit: "×",
      min: 1,
      max: 1.5,
      step: 0.01,
      label: "Aperture overscan",
      description:
        "How far past the frame's diagonal an aperture transition opens, so its edge clears the corners.",
    }),
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
  ...STAGE_TOKENS,
  ...OVERLAY_TOKENS,
  ...TRANSITION_TOKENS,
  NetworkGraph: NETWORK_GRAPH_TOKENS,
  RadialNetwork: RADIAL_NETWORK_TOKENS,
  PlexusField: PLEXUS_FIELD_TOKENS,
  OrbitalSystem: ORBITAL_SYSTEM_TOKENS,
  DataPipeline: DATA_PIPELINE_TOKENS,
  PredicatePushdownBoundary: PREDICATE_PUSHDOWN_TOKENS,
  CodeWindow: CODE_WINDOW_TOKENS,
  CodeFocus: CODE_FOCUS_TOKENS,
  SchemaMapping: SCHEMA_MAPPING_TOKENS,
  QueryColumnCacheGrowth: QUERY_CACHE_TOKENS,
  SourceMerge: SOURCE_MERGE_TOKENS,
  DecisionFork: DECISION_FORK_TOKENS,
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
