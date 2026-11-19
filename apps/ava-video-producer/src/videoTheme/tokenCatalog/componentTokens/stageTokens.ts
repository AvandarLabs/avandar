import { token } from "../defineTokensHelpers";
import {
  createColorToken,
  createDurationToken,
  createEasingToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/**
 * Tokens of the stage: heading, subtitle, shared object, evidence chip, and
 * product frame.
 */
export const STAGE_TOKENS = {
  Heading: {
    entranceDuration: createDurationToken(
      "Heading entrance duration",
      "How long a beat heading takes to arrive.",
      "stage",
    ),
    entranceEasing: createEasingToken(
      "Heading entrance curve",
      "The curve of a beat heading arriving.",
      "stage",
    ),
    entranceDistance: createLengthToken(
      "Heading rise",
      "How far a beat heading rises as it arrives.",
      "stage",
    ),
  },
  Subtitle: {
    gap: createLengthToken(
      "Subtitle gap",
      "Space between a beat heading and its subtitle.",
      "stage",
    ),
  },
  SharedObject: {
    borderWidth: createStrokeToken(
      "Shared object border",
      "Border width of an object that travels between motions.",
      "stage",
    ),
    fill: createColorToken(
      "Shared object fill",
      "Fill of an object that travels between motions.",
      "stage",
    ),
    fadeIn: createDurationToken(
      "Shared object fade-in",
      "How long a shared object takes to appear.",
      "stage",
    ),
    outlineFade: createDurationToken(
      "Outline fade",
      "How long an outline-only shared object takes to fade after it lands.",
      "stage",
    ),
  },
  EvidenceChip: {
    padding: token({
      kind: "box",
      surface: "stage",
      label: "Evidence chip padding",
      description:
        "Space inside an evidence chip: x on the sides and y above and below.",
    }),
  },
  ProductFrame: {
    backdrop: createColorToken(
      "Reenactment backdrop",
      "The backdrop drawn around a reenactment on the stage.",
      "stage",
    ),
  },
} as const;
