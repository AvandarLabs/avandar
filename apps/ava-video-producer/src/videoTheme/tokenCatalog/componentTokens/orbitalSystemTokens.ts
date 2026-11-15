import {
  createAlphaToken,
  createDurationToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the orbital system. */
export const ORBITAL_SYSTEM_TOKENS = {
  orbitAlpha: createAlphaToken("Orbit opacity", "Opacity of an orbit's path."),
  orbitWidth: createStrokeToken("Orbit width", "Width of an orbit's path."),
  bodyRadius: createLengthToken(
    "Body radius",
    "Radius of an orbiting body's shell.",
  ),
  bodyCoreRadius: createLengthToken(
    "Body core radius",
    "Radius of the dot inside an orbiting body.",
  ),
  bodyAlpha: createAlphaToken(
    "Body rim opacity",
    "Opacity of an orbiting body's rim.",
  ),
  bodyStrokeWidth: createStrokeToken(
    "Body rim width",
    "Width of an orbiting body's rim.",
  ),
  bodyLabelOffset: createLengthToken(
    "Body label offset",
    "Distance from a body's centre up to its label baseline.",
  ),
  coreRadius: createLengthToken("Core radius", "Radius of the central core."),
  coreStrokeAlpha: createAlphaToken(
    "Core rim opacity",
    "Opacity of the central core's accent rim.",
  ),
  coreStrokeWidth: createStrokeToken(
    "Core rim width",
    "Width of the central core's accent rim.",
  ),
  pulsePeriod: createDurationToken(
    "Core pulse period",
    "Frames for one breath of the glow around the core.",
  ),
  pulseRadius: createLengthToken(
    "Core pulse radius",
    "Radius of the glow around the core at rest.",
  ),
  pulseSwing: createLengthToken(
    "Core pulse swing",
    "How far the glow around the core grows at the top of a breath.",
  ),
  pulseAlpha: createAlphaToken(
    "Core pulse opacity",
    "Opacity of the glow around the core.",
  ),
  pulseStrokeAlpha: createAlphaToken(
    "Core pulse rim opacity",
    "Opacity of the glow's rim.",
  ),
  pulseStrokeWidth: createStrokeToken(
    "Core pulse rim width",
    "Width of the glow's rim.",
  ),
} as const;
