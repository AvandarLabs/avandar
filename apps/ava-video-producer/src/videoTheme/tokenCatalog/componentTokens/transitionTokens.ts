import { TokenDefinitions } from "../TokenDefinitions";
import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the morph and aperture transitions. */
export const TRANSITION_TOKENS = {
  Morph: {
    startRadius: ComponentTokenDefinitions.makeLengthToken({
      label: "Morph start radius",
      description:
        "Corner radius a morph transition starts from before it opens to the full frame.",
      surface: "stage",
    }),
  },
  Aperture: {
    overscan: TokenDefinitions.token({
      kind: "number",
      surface: "stage",
      unit: "×",
      min: 1,
      max: 1.5,
      step: 0.01,
      label: "Aperture overscan",
      description:
        "How far past the frame's diagonal an aperture transition opens, so its edge clears the corners.",
    }),
  },
} as const;
