import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the code focus. */
export const CODE_FOCUS_TOKENS = {
  highlightRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Line highlight radius",
    description: "Corner radius of the highlight behind the focused line.",
  }),
  highlightAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Line highlight opacity",
    description: "Opacity of the highlight behind the focused line.",
  }),
  markerWidth: ComponentTokenDefinitions.makeLengthToken({
    label: "Line marker width",
    description: "Width of the accent bar beside the focused line.",
  }),
  dividerWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Footer divider width",
    description: "Width of the line above the window's footer.",
  }),
  footerDotRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Footer dot radius",
    description: "Radius of the accent dot in the footer.",
  }),
} as const;
