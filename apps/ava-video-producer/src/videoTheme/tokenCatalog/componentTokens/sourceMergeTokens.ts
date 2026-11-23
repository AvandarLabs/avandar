import {
  createAlphaToken,
  createDurationToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the source merge. */
export const SOURCE_MERGE_TOKENS = {
  edgeAlpha: createAlphaToken(
    "Source edge opacity",
    "Opacity of an edge from a source to the merge.",
  ),
  chipRadius: createLengthToken(
    "Source chip radius",
    "Corner radius of a source's kind chip.",
  ),
  chipFillAlpha: createAlphaToken(
    "Source chip fill",
    "Opacity of a source chip's tint.",
  ),
  chipStrokeAlpha: createAlphaToken(
    "Source chip outline",
    "Opacity of a source chip's outline.",
  ),
  chipStrokeWidth: createStrokeToken(
    "Source chip outline width",
    "Width of a source chip's outline.",
  ),
  outEdgeAlpha: createAlphaToken(
    "Output edge opacity",
    "Opacity of the edge from the merge to the destination.",
  ),
  outEdgeWidth: createStrokeToken(
    "Output edge width",
    "Width of the edge from the merge to the destination.",
  ),
  outPacketPeriod: createDurationToken(
    "Output packet period",
    "Frames for a packet to cross from the merge to the destination.",
  ),
  mergeRadius: createLengthToken(
    "Merge node radius",
    "Radius of the merge node.",
  ),
  mergeStrokeAlpha: createAlphaToken(
    "Merge node rim opacity",
    "Opacity of the merge node's accent rim.",
  ),
  mergeStrokeWidth: createStrokeToken(
    "Merge node rim width",
    "Width of the merge node's accent rim.",
  ),
  glyphWidth: createStrokeToken(
    "Merge glyph width",
    "Stroke width of the merge glyph.",
  ),
  barHeight: createLengthToken(
    "Destination bar height",
    "Thickness of the accent bar on the destination panel.",
  ),
  barAlpha: createAlphaToken(
    "Destination bar opacity",
    "Opacity of the accent bar on the destination panel.",
  ),
  slotRadius: createLengthToken(
    "Destination slot radius",
    "Corner radius of a slot on the destination panel.",
  ),
  slotFillAlpha: createAlphaToken(
    "Destination slot fill",
    "Opacity of a destination slot's tint.",
  ),
  slotStrokeAlpha: createAlphaToken(
    "Destination slot line opacity",
    "Opacity of the line inside a destination slot.",
  ),
  slotStrokeWidth: createStrokeToken(
    "Destination slot line width",
    "Width of the line inside a destination slot.",
  ),
} as const;
