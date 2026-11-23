import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the network graph. */
export const NETWORK_GRAPH_TOKENS = {
  highlightEdgeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Highlighted edge opacity",
    description:
      "Opacity of the first edges of a network graph, drawn in the accent.",
  }),
  edgeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Network edge opacity",
    description: "Opacity of the remaining edges of a network graph.",
  }),
  hubPulsePeriod: ComponentTokenDefinitions.makeDurationToken({
    label: "Hub pulse period",
    description: "Frames for one breath of the hub node.",
  }),
  hubPulseFloor: ComponentTokenDefinitions.makeAlphaToken({
    label: "Hub pulse floor",
    description: "The hub's lowest activity while it breathes.",
  }),
  hubPulseSwing: ComponentTokenDefinitions.makeAlphaToken({
    label: "Hub pulse swing",
    description: "How far the hub's activity rises above its floor.",
  }),
  nodePulsePeriod: ComponentTokenDefinitions.makeDurationToken({
    label: "Outer node pulse period",
    description: "Frames for one breath of an outer node.",
  }),
  nodePulseSwing: ComponentTokenDefinitions.makeAlphaToken({
    label: "Outer node pulse swing",
    description:
      "How high an outer node's activity rises at the top of a breath.",
  }),
} as const;
