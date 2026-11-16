import { token } from "../defineTokensHelpers";
import {
  createAlphaToken,
  createDurationToken,
  createEasingToken,
  createLengthToken,
  createOffsetToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the overlays drawn over a scene: thesis, underline, annotation, spotlight, connector, and floating pieces. */
export const OVERLAY_TOKENS = {
  Thesis: {
    gap: createLengthToken(
      "Thesis line gap",
      "Space between thesis lines.",
      "stage",
    ),
    inset: token({
      kind: "box",
      surface: "stage",
      label: "Thesis inset",
      description:
        "Where the thesis block sits: top, x from both sides, and bottom.",
    }),
    emphasisGap: createLengthToken(
      "Thesis emphasis gap",
      "Space above the thesis's supporting line.",
      "stage",
    ),
    lineStagger: token({
      kind: "number",
      surface: "stage",
      unit: "frames",
      min: 0,
      max: 60,
      step: 1,
      label: "Thesis line stagger",
      description: "Frames between thesis lines starting to arrive.",
    }),
    lineDuration: createDurationToken(
      "Thesis line duration",
      "How long a thesis line takes to arrive.",
      "stage",
    ),
    lineEasing: createEasingToken(
      "Thesis line curve",
      "The curve of a thesis line arriving.",
      "stage",
    ),
    lineDistance: createLengthToken(
      "Thesis line rise",
      "How far a thesis line rises as it arrives.",
      "stage",
    ),
  },
  Underline: {
    strokeWidth: createStrokeToken(
      "Underline width",
      "Width of the hand-drawn teaching underline.",
      "stage",
    ),
    seed: token({
      kind: "number",
      surface: "stage",
      min: 0,
      max: 9999,
      step: 1,
      label: "Underline seed",
      description:
        "Fixes the wobble of the teaching underline so every frame draws the same line.",
    }),
    drawIn: createDurationToken(
      "Underline draw-in",
      "How long the teaching underline takes to draw.",
      "stage",
    ),
  },
  Annotation: {
    strokeWidth: createStrokeToken(
      "Annotation width",
      "Width of hand-drawn boxes, brackets, and circles on the product stage.",
      "stage",
    ),
    highlightAlpha: createAlphaToken(
      "Highlight opacity",
      "Opacity of a hand-drawn highlight on the product stage.",
      "stage",
    ),
    drawIn: createDurationToken(
      "Annotation draw-in",
      "How long a hand-drawn mark takes to draw and to retract.",
      "stage",
    ),
  },
  Spotlight: {
    padding: createLengthToken(
      "Spotlight padding",
      "Space between a spotlit region and the edge of its cut-out.",
      "stage",
    ),
    scrimSpread: token({
      kind: "length",
      surface: "stage",
      unit: "px",
      min: 0,
      max: 4000,
      step: 10,
      label: "Scrim spread",
      description:
        "How far the scrim around a spotlight extends. It must reach past every stage edge.",
    }),
  },
  Connector: {
    strokeWidth: createStrokeToken(
      "Connector width",
      "Width of the dashed connector from a source to its explanation.",
      "stage",
    ),
    dash: token({
      kind: "dash",
      surface: "stage",
      label: "Connector dash",
      description: "Dash pattern of a connector, in pixels.",
    }),
    bend: createOffsetToken(
      "Connector bend",
      "How far past its target a connector's end swings sideways.",
      "stage",
    ),
    drop: createOffsetToken(
      "Connector drop",
      "How far below its target a connector ends.",
      "stage",
    ),
    drawIn: createDurationToken(
      "Connector draw-in",
      "How long a connector takes to draw.",
      "stage",
    ),
    easing: createEasingToken(
      "Connector curve",
      "The curve of a connector drawing in.",
      "stage",
    ),
  },
  FloatingLabel: {
    padding: token({
      kind: "box",
      surface: "stage",
      label: "Floating label padding",
      description:
        "Space inside a floating label: x on the sides and y above and below.",
    }),
    offset: createLengthToken(
      "Floating label offset",
      "Space between a floating label and the artwork it names.",
      "stage",
    ),
    borderWidth: createStrokeToken(
      "Floating label border",
      "Border width of a floating label.",
      "stage",
    ),
  },
  FloatingDiagram: {
    elevation: token({
      kind: "elevation",
      surface: "stage",
      label: "Floating diagram elevation",
      description: "The shadow under artwork lifted off the product stage.",
    }),
  },
} as const;
