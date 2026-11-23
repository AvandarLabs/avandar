import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the orbital system. */
export const ORBITAL_SYSTEM_TOKENS = {
  orbitAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Orbit opacity",
    description: "Opacity of an orbit's path.",
  }),
  orbitWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Orbit width",
    description: "Width of an orbit's path.",
  }),
  bodyRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Body radius",
    description: "Radius of an orbiting body's shell.",
  }),
  bodyCoreRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Body core radius",
    description: "Radius of the dot inside an orbiting body.",
  }),
  bodyAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Body rim opacity",
    description: "Opacity of an orbiting body's rim.",
  }),
  bodyStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Body rim width",
    description: "Width of an orbiting body's rim.",
  }),
  bodyLabelOffset: ComponentTokenDefinitions.makeLengthToken({
    label: "Body label offset",
    description: "Distance from a body's centre up to its label baseline.",
  }),
  coreRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Core radius",
    description: "Radius of the central core.",
  }),
  coreStrokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Core rim opacity",
    description: "Opacity of the central core's accent rim.",
  }),
  coreStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Core rim width",
    description: "Width of the central core's accent rim.",
  }),
  pulsePeriod: ComponentTokenDefinitions.makeDurationToken({
    label: "Core pulse period",
    description: "Frames for one breath of the glow around the core.",
  }),
  pulseRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Core pulse radius",
    description: "Radius of the glow around the core at rest.",
  }),
  pulseSwing: ComponentTokenDefinitions.makeLengthToken({
    label: "Core pulse swing",
    description:
      "How far the glow around the core grows at the top of a breath.",
  }),
  pulseAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Core pulse opacity",
    description: "Opacity of the glow around the core.",
  }),
  pulseStrokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Core pulse rim opacity",
    description: "Opacity of the glow's rim.",
  }),
  pulseStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Core pulse rim width",
    description: "Width of the glow's rim.",
  }),
} as const;
