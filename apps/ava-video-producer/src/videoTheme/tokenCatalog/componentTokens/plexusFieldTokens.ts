import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the plexus field. */
export const PLEXUS_FIELD_TOKENS = {
  linkDistance: ComponentTokenDefinitions.makeLengthToken({
    label: "Link distance",
    description: "Particles closer than this are joined by a line.",
  }),
  linkAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Link opacity",
    description:
      "Opacity of a link between touching particles; it fades out with distance.",
  }),
  linkWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Link width",
    description: "Width of a link between particles.",
  }),
} as const;
