import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReadinessGatePositions } from "./ReadinessGatePositions";
import type { ReactNode } from "react";

type Props = {
  horizontal: boolean;
  allReady: boolean;
  frame: number;
};

type GateTimingOptions = {
  horizontal: Readonly<Props>["horizontal"];
  allReady: Readonly<Props>["allReady"];
  frame: Readonly<Props>["frame"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type GateTimingResult = {
  before: { x1: number; x2: number; y1: number; y2: number };
  after: { x1: number; x2: number; y1: number; y2: number };
  hinge: {
    cx: number;
    cy: number;
    r: number;
    fill: ReturnType<
      typeof GraphicThemeHooks.useGraphicTokens
    >["color"]["highlight"];
  };
};

/** The gate sections' line weight, before the theme's line weight scale. */
const GATE_WIDTH = 5;

/** Samples the readiness gate before state for the current authored frame. */
function _getReadinessGateBeforeState({
  horizontal,
  allReady,
  frame,
  tokens,
  motion,
}: Readonly<GateTimingOptions>): GateTimingResult {
  const opening = allReady
    ? motion.ramp(frame, 122, motion.whip, motion.travel.easing)
    : 0;
  const halfGap = opening * (horizontal ? 40 : 132);
  const before = horizontal
    ? { x1: 650, x2: 650, y1: 110, y2: 500 - halfGap }
    : { x1: 12, x2: 150 - halfGap, y1: 400, y2: 400 };
  const after = horizontal
    ? { x1: 650, x2: 650, y1: 500 + halfGap, y2: 548 }
    : { x1: 150 + halfGap, x2: 930, y1: 400, y2: 400 };
  const hinge = {
    cx: horizontal
      ? 650
      : Motion.mix({
          t: opening,
          from: 150,
          to: 18,
        }),
    cy: horizontal
      ? Motion.mix({
          t: opening,
          from: 500,
          to: 460,
        })
      : 400,
    r: 4,
    fill: tokens.color.highlight,
  };
  return { before, after, hinge };
}

/** Two solid gate sections separate to clear the full result's passage. */
export function ReadinessGate({
  horizontal,
  allReady,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const gate = {
    profile: tokens.sketch.shape,
    stroke: tokens.color.highlight,
    strokeWidth: scales.stroke(GATE_WIDTH),
  };
  const { before, after, hinge } = _getReadinessGateBeforeState({
    horizontal,
    allReady,
    frame,
    tokens,
    motion,
  });
  return (
    <ReadinessGatePositions
      frame={frame}
      motion={motion}
      gate={gate}
      before={before}
      after={after}
      hinge={hinge}
    />
  );
}
