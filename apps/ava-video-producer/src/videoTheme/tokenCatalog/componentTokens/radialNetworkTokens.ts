import {
  createAlphaToken,
  createDurationToken,
  createLengthToken,
  createOffsetToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the radial network. */
export const RADIAL_NETWORK_TOKENS = {
  spokeAlpha: createAlphaToken(
    "Spoke opacity",
    "Opacity of the spokes from the hub to each node.",
  ),
  spokePulsePeriod: createDurationToken(
    "Spoke node pulse period",
    "Frames for one breath of a spoke node.",
  ),
  spokePulseSwing: createAlphaToken(
    "Spoke node pulse swing",
    "How high a spoke node's activity rises at the top of a breath.",
  ),
  hubRadius: createLengthToken(
    "Hub radius",
    "Radius of the hub disc at the centre of a radial network.",
  ),
  hubStrokeAlpha: createAlphaToken(
    "Hub rim opacity",
    "Opacity of the hub's accent rim.",
  ),
  hubStrokeWidth: createStrokeToken(
    "Hub rim width",
    "Width of the hub's accent rim.",
  ),
  hubGlowRadius: createLengthToken(
    "Hub glow radius",
    "Radius of the soft glow inside the hub.",
  ),
  hubGlowAlpha: createAlphaToken(
    "Hub glow opacity",
    "Opacity of the soft glow inside the hub.",
  ),
  hubLabelOffset: createOffsetToken(
    "Hub label offset",
    "Vertical distance from the hub centre to its label baseline.",
  ),
  hubDetailOffset: createOffsetToken(
    "Hub detail offset",
    "Vertical distance from the hub centre to its detail baseline.",
  ),
} as const;
