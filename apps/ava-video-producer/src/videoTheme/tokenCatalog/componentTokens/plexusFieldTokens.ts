import {
  createAlphaToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the plexus field. */
export const PLEXUS_FIELD_TOKENS = {
  linkDistance: createLengthToken(
    "Link distance",
    "Particles closer than this are joined by a line.",
  ),
  linkAlpha: createAlphaToken(
    "Link opacity",
    "Opacity of a link between touching particles; it fades out with distance.",
  ),
  linkWidth: createStrokeToken(
    "Link width",
    "Width of a link between particles.",
  ),
} as const;
