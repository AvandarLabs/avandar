import {
  createAlphaToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the code focus. */
export const CODE_FOCUS_TOKENS = {
  highlightRadius: createLengthToken(
    "Line highlight radius",
    "Corner radius of the highlight behind the focused line.",
  ),
  highlightAlpha: createAlphaToken(
    "Line highlight opacity",
    "Opacity of the highlight behind the focused line.",
  ),
  markerWidth: createLengthToken(
    "Line marker width",
    "Width of the accent bar beside the focused line.",
  ),
  dividerWidth: createStrokeToken(
    "Footer divider width",
    "Width of the line above the window's footer.",
  ),
  footerDotRadius: createLengthToken(
    "Footer dot radius",
    "Radius of the accent dot in the footer.",
  ),
} as const;
