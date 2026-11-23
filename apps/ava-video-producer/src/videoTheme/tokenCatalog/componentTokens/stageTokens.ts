import { TokenDefinitions } from "../TokenDefinitions";
import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/**
 * Tokens of the stage: heading, subtitle, shared object, evidence chip, and
 * product frame.
 */
export const STAGE_TOKENS = {
  Heading: {
    entranceDuration: ComponentTokenDefinitions.makeDurationToken({
      label: "Heading entrance duration",
      description: "How long a beat heading takes to arrive.",
      surface: "stage",
    }),
    entranceEasing: ComponentTokenDefinitions.makeEasingToken({
      label: "Heading entrance curve",
      description: "The curve of a beat heading arriving.",
      surface: "stage",
    }),
    entranceDistance: ComponentTokenDefinitions.makeLengthToken({
      label: "Heading rise",
      description: "How far a beat heading rises as it arrives.",
      surface: "stage",
    }),
  },
  Subtitle: {
    gap: ComponentTokenDefinitions.makeLengthToken({
      label: "Subtitle gap",
      description: "Space between a beat heading and its subtitle.",
      surface: "stage",
    }),
  },
  SharedObject: {
    borderWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Shared object border",
      description: "Border width of an object that travels between motions.",
      surface: "stage",
    }),
    fill: ComponentTokenDefinitions.makeColorToken({
      label: "Shared object fill",
      description: "Fill of an object that travels between motions.",
      surface: "stage",
    }),
    fadeIn: ComponentTokenDefinitions.makeDurationToken({
      label: "Shared object fade-in",
      description: "How long a shared object takes to appear.",
      surface: "stage",
    }),
    outlineFade: ComponentTokenDefinitions.makeDurationToken({
      label: "Outline fade",
      description:
        "How long an outline-only shared object takes to fade after it lands.",
      surface: "stage",
    }),
  },
  EvidenceChip: {
    padding: TokenDefinitions.token({
      kind: "box",
      surface: "stage",
      label: "Evidence chip padding",
      description:
        "Space inside an evidence chip: x on the sides and y above and below.",
    }),
  },
  ProductFrame: {
    backdrop: ComponentTokenDefinitions.makeColorToken({
      label: "Reenactment backdrop",
      description: "The backdrop drawn around a reenactment on the stage.",
      surface: "stage",
    }),
  },
} as const;
