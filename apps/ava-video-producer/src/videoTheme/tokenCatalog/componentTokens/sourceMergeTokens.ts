import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the source merge. */
export const SOURCE_MERGE_TOKENS = {
  edgeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Source edge opacity",
    description: "Opacity of an edge from a source to the merge.",
  }),
  chipRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Source chip radius",
    description: "Corner radius of a source's kind chip.",
  }),
  chipFillAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Source chip fill",
    description: "Opacity of a source chip's tint.",
  }),
  chipStrokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Source chip outline",
    description: "Opacity of a source chip's outline.",
  }),
  chipStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Source chip outline width",
    description: "Width of a source chip's outline.",
  }),
  outEdgeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Output edge opacity",
    description: "Opacity of the edge from the merge to the destination.",
  }),
  outEdgeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Output edge width",
    description: "Width of the edge from the merge to the destination.",
  }),
  outPacketPeriod: ComponentTokenDefinitions.makeDurationToken({
    label: "Output packet period",
    description:
      "Frames for a packet to cross from the merge to the destination.",
  }),
  mergeRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Merge node radius",
    description: "Radius of the merge node.",
  }),
  mergeStrokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Merge node rim opacity",
    description: "Opacity of the merge node's accent rim.",
  }),
  mergeStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Merge node rim width",
    description: "Width of the merge node's accent rim.",
  }),
  glyphWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Merge glyph width",
    description: "Stroke width of the merge glyph.",
  }),
  barHeight: ComponentTokenDefinitions.makeLengthToken({
    label: "Destination bar height",
    description: "Thickness of the accent bar on the destination panel.",
  }),
  barAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Destination bar opacity",
    description: "Opacity of the accent bar on the destination panel.",
  }),
  slotRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Destination slot radius",
    description: "Corner radius of a slot on the destination panel.",
  }),
  slotFillAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Destination slot fill",
    description: "Opacity of a destination slot's tint.",
  }),
  slotStrokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Destination slot line opacity",
    description: "Opacity of the line inside a destination slot.",
  }),
  slotStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Destination slot line width",
    description: "Width of the line inside a destination slot.",
  }),
} as const;
