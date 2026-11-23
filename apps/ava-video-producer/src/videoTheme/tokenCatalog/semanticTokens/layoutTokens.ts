import { TokenDefinitions } from "../TokenDefinitions";
/**
 * Graphic margins and stage insets declared by SEMANTIC_TOKENS for theme
 * editing and renderer layout.
 */
export const LAYOUT_TOKENS = {
  graphic: {
    margin: TokenDefinitions.token({
      kind: "length",
      surface: "graphic",
      unit: "px",
      min: 0,
      max: 300,
      step: 1,
      label: "Graphic margin",
      description: "Distance from the edges of a graphic to its content.",
    }),
    eyebrowOrigin: TokenDefinitions.token({
      kind: "box",
      surface: "graphic",
      label: "Eyebrow position",
      description:
        "Where the eyebrow baseline starts: x from the left edge and y from the top.",
    }),
    captionBaseline: TokenDefinitions.token({
      kind: "length",
      surface: "graphic",
      unit: "px",
      min: 0,
      max: 300,
      step: 1,
      label: "Caption baseline",
      description:
        "Distance from the bottom of a graphic to the baseline of its caption.",
    }),
  },
  stage: {
    headingInset: TokenDefinitions.token({
      kind: "box",
      surface: "stage",
      label: "Heading inset",
      description:
        "Where the heading block of a beat sits: x from both sides and top from the top edge.",
    }),
    graphicInset: TokenDefinitions.token({
      kind: "box",
      surface: "stage",
      label: "Graphic inset",
      description:
        "Where the graphic of a beat sits: x from both sides, plus top and bottom.",
    }),
    evidenceRow: TokenDefinitions.token({
      kind: "box",
      surface: "stage",
      label: "Evidence row",
      description:
        "Where the evidence row sits: x from both sides, bottom from the bottom edge, and the gap between chips.",
    }),
  },
} as const;
