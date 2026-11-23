import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the code window. */
export const CODE_WINDOW_TOKENS = {
  radius: ComponentTokenDefinitions.makeLengthToken({
    label: "Code window radius",
    description: "Corner radius of the editor window.",
  }),
  dividerWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Code window divider width",
    description: "Width of the line under the window's title bar.",
  }),
  dotRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Window dot radius",
    description: "Radius of the three dots in the title bar.",
  }),
  dotAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Window dot opacity",
    description: "Opacity of the three dots in the title bar.",
  }),
} as const;
