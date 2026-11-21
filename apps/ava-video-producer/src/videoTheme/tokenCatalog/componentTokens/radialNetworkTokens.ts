import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the radial network. */
export const RADIAL_NETWORK_TOKENS = {
  spokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Spoke opacity",
    description: "Opacity of the spokes from the hub to each node.",
  }),
  spokePulsePeriod: ComponentTokenDefinitions.makeDurationToken({
    label: "Spoke node pulse period",
    description: "Frames for one breath of a spoke node.",
  }),
  spokePulseSwing: ComponentTokenDefinitions.makeAlphaToken({
    label: "Spoke node pulse swing",
    description:
      "How high a spoke node's activity rises at the top of a breath.",
  }),
  hubRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Hub radius",
    description: "Radius of the hub disc at the centre of a radial network.",
  }),
  hubStrokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Hub rim opacity",
    description: "Opacity of the hub's accent rim.",
  }),
  hubStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Hub rim width",
    description: "Width of the hub's accent rim.",
  }),
  hubGlowRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Hub glow radius",
    description: "Radius of the soft glow inside the hub.",
  }),
  hubGlowAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Hub glow opacity",
    description: "Opacity of the soft glow inside the hub.",
  }),
  hubLabelOffset: ComponentTokenDefinitions.makeOffsetToken({
    label: "Hub label offset",
    description: "Vertical distance from the hub centre to its label baseline.",
  }),
  hubDetailOffset: ComponentTokenDefinitions.makeOffsetToken({
    label: "Hub detail offset",
    description:
      "Vertical distance from the hub centre to its detail baseline.",
  }),
} as const;
