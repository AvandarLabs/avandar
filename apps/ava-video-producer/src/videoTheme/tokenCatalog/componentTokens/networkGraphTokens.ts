import { createAlphaToken, createDurationToken } from "./componentTokenHelpers";

/** Tokens of the network graph. */
export const NETWORK_GRAPH_TOKENS = {
  highlightEdgeAlpha: createAlphaToken(
    "Highlighted edge opacity",
    "Opacity of the first edges of a network graph, drawn in the accent.",
  ),
  edgeAlpha: createAlphaToken(
    "Network edge opacity",
    "Opacity of the remaining edges of a network graph.",
  ),
  hubPulsePeriod: createDurationToken(
    "Hub pulse period",
    "Frames for one breath of the hub node.",
  ),
  hubPulseFloor: createAlphaToken(
    "Hub pulse floor",
    "The hub's lowest activity while it breathes.",
  ),
  hubPulseSwing: createAlphaToken(
    "Hub pulse swing",
    "How far the hub's activity rises above its floor.",
  ),
  nodePulsePeriod: createDurationToken(
    "Outer node pulse period",
    "Frames for one breath of an outer node.",
  ),
  nodePulseSwing: createAlphaToken(
    "Outer node pulse swing",
    "How high an outer node's activity rises at the top of a breath.",
  ),
} as const;
