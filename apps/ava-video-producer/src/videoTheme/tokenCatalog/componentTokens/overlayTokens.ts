import { TokenDefinitions } from "../TokenDefinitions";
import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/**
 * Tokens of the overlays drawn over a scene: thesis, underline, annotation,
 * spotlight, connector, and floating pieces.
 */
export const OVERLAY_TOKENS = {
  Thesis: {
    gap: ComponentTokenDefinitions.makeLengthToken({
      label: "Thesis line gap",
      description: "Space between thesis lines.",
      surface: "stage",
    }),
    inset: TokenDefinitions.token({
      kind: "box",
      surface: "stage",
      label: "Thesis inset",
      description:
        "Where the thesis block sits: top, x from both sides, and bottom.",
    }),
    emphasisGap: ComponentTokenDefinitions.makeLengthToken({
      label: "Thesis emphasis gap",
      description: "Space above the thesis's supporting line.",
      surface: "stage",
    }),
    lineStagger: TokenDefinitions.token({
      kind: "number",
      surface: "stage",
      unit: "frames",
      min: 0,
      max: 60,
      step: 1,
      label: "Thesis line stagger",
      description: "Frames between thesis lines starting to arrive.",
    }),
    lineDuration: ComponentTokenDefinitions.makeDurationToken({
      label: "Thesis line duration",
      description: "How long a thesis line takes to arrive.",
      surface: "stage",
    }),
    lineEasing: ComponentTokenDefinitions.makeEasingToken({
      label: "Thesis line curve",
      description: "The curve of a thesis line arriving.",
      surface: "stage",
    }),
    lineDistance: ComponentTokenDefinitions.makeLengthToken({
      label: "Thesis line rise",
      description: "How far a thesis line rises as it arrives.",
      surface: "stage",
    }),
  },
  Underline: {
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Underline width",
      description: "Width of the hand-drawn teaching underline.",
      surface: "stage",
    }),
    seed: TokenDefinitions.token({
      kind: "number",
      surface: "stage",
      min: 0,
      max: 9999,
      step: 1,
      label: "Underline seed",
      description:
        "Fixes the wobble of the teaching underline so every frame draws the same line.",
    }),
    drawIn: ComponentTokenDefinitions.makeDurationToken({
      label: "Underline draw-in",
      description: "How long the teaching underline takes to draw.",
      surface: "stage",
    }),
  },
  Annotation: {
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Annotation width",
      description:
        "Width of hand-drawn boxes, brackets, and circles on the product stage.",
      surface: "stage",
    }),
    highlightAlpha: ComponentTokenDefinitions.makeAlphaToken({
      label: "Highlight opacity",
      description: "Opacity of a hand-drawn highlight on the product stage.",
      surface: "stage",
    }),
    drawIn: ComponentTokenDefinitions.makeDurationToken({
      label: "Annotation draw-in",
      description: "How long a hand-drawn mark takes to draw and to retract.",
      surface: "stage",
    }),
  },
  Spotlight: {
    padding: ComponentTokenDefinitions.makeLengthToken({
      label: "Spotlight padding",
      description:
        "Space between a spotlit region and the edge of its cut-out.",
      surface: "stage",
    }),
    scrimSpread: TokenDefinitions.token({
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
    strokeWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Connector width",
      description:
        "Width of the dashed connector from a source to its explanation.",
      surface: "stage",
    }),
    dash: TokenDefinitions.token({
      kind: "dash",
      surface: "stage",
      label: "Connector dash",
      description: "Dash pattern of a connector, in pixels.",
    }),
    bend: ComponentTokenDefinitions.makeOffsetToken({
      label: "Connector bend",
      description: "How far past its target a connector's end swings sideways.",
      surface: "stage",
    }),
    drop: ComponentTokenDefinitions.makeOffsetToken({
      label: "Connector drop",
      description: "How far below its target a connector ends.",
      surface: "stage",
    }),
    drawIn: ComponentTokenDefinitions.makeDurationToken({
      label: "Connector draw-in",
      description: "How long a connector takes to draw.",
      surface: "stage",
    }),
    easing: ComponentTokenDefinitions.makeEasingToken({
      label: "Connector curve",
      description: "The curve of a connector drawing in.",
      surface: "stage",
    }),
  },
  FloatingLabel: {
    padding: TokenDefinitions.token({
      kind: "box",
      surface: "stage",
      label: "Floating label padding",
      description:
        "Space inside a floating label: x on the sides and y above and below.",
    }),
    offset: ComponentTokenDefinitions.makeLengthToken({
      label: "Floating label offset",
      description: "Space between a floating label and the artwork it names.",
      surface: "stage",
    }),
    borderWidth: ComponentTokenDefinitions.makeStrokeToken({
      label: "Floating label border",
      description: "Border width of a floating label.",
      surface: "stage",
    }),
  },
  FloatingDiagram: {
    elevation: TokenDefinitions.token({
      kind: "elevation",
      surface: "stage",
      label: "Floating diagram elevation",
      description: "The shadow under artwork lifted off the product stage.",
    }),
  },
} as const;
