import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ReadinessLatch.schema";
import type { ReactNode } from "react";

type Props = {
  horizontal: boolean;
  allReady: boolean;
  frame: number;
  accent: string;
  input: Input;
};

type CenterXOptions = {
  horizontal: Readonly<Props>["horizontal"];
  allReady: Readonly<Props>["allReady"];
  frame: Readonly<Props>["frame"];
  accent: Readonly<Props>["accent"];
  input: Readonly<Props>["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

type CenterXResult = {
  centerX: number;
  centerY: number;
  panel: {
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
    fill: ReturnType<
      typeof GraphicThemeHooks.useGraphicTokens
    >["color"]["surface"];
    stroke: Readonly<Props>["accent"];
    strokeWidth: number;
  };
  label: {
    text: Readonly<Props>["input"]["sharedAction"];
    x: number;
    y: number;
  };
};

const LABEL = {
  width: 204,
  fontSize: 12 as const,
  maxLines: 3,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  "width" | "fontSize" | "maxLines" | "breakLongWords" | "normalizeWhitespace"
>;

/**
 * Samples the readiness result center xstate for the current authored frame.
 */
function _getReadinessResultCenterXState({
  horizontal,
  allReady,
  frame,
  accent,
  input,
  tokens,
  motion,
  scales,
}: Readonly<CenterXOptions>): CenterXResult {
  const release = allReady
    ? motion.ramp(frame, 130, motion.scale(16), motion.travel.easing)
    : 0;
  const centerX = horizontal
    ? Motion.mix({
        t: release,
        from: 500,
        to: 800,
      })
    : 150;
  const centerY = horizontal
    ? 500
    : Motion.mix({
        t: release,
        from: 350,
        to: 485,
      });
  const panel = {
    x: centerX - 124,
    y: centerY - 32,
    width: 248,
    height: 64,
    rx: scales.corner(tokens.corner.cell),
    fill: tokens.color.surface,
    stroke: accent,
    strokeWidth: scales.stroke(tokens.stroke.default),
  };
  const label = { text: input.sharedAction, x: centerX - 88, y: centerY - 16 };
  return { centerX, centerY, panel, label };
}

/**
 * The complete labeled result waits upstream and passes through a clear gap.
 */
export function ReadinessResult({
  horizontal,
  allReady,
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { centerX, centerY, panel, label } = _getReadinessResultCenterXState({
    horizontal,
    allReady,
    frame,
    accent,
    input,
    tokens,
    motion,
    scales,
  });
  return (
    <g opacity={motion.reveal(frame, 22)}>
      <StockRect data-result="single" {...panel} />
      <circle cx={centerX - 108} cy={centerY} r={8} fill={accent} />
      {input.showLabels ? <FitText {...LABEL} {...label} /> : undefined}
    </g>
  );
}
