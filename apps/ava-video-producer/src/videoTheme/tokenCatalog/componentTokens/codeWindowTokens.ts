import {
  createAlphaToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the code window. */
export const CODE_WINDOW_TOKENS = {
  radius: createLengthToken(
    "Code window radius",
    "Corner radius of the editor window.",
  ),
  dividerWidth: createStrokeToken(
    "Code window divider width",
    "Width of the line under the window's title bar.",
  ),
  dotRadius: createLengthToken(
    "Window dot radius",
    "Radius of the three dots in the title bar.",
  ),
  dotAlpha: createAlphaToken(
    "Window dot opacity",
    "Opacity of the three dots in the title bar.",
  ),
} as const;
