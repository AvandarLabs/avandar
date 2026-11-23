import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../TradeoffPivot.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  input: Input;
  side: "gain" | "concession";
  frame: number;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  side: Options["side"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  isGain: boolean;
  entrance: number;
  angle: number;
  x: number;
  color: string;
  panel: { x: number; y: number; width: number; height: number; rx: number };
  label: {
    text: string;
    x: number;
    y: number;
    width: number;
    fontSize: 18;
    maxLines: number;
  };
};

/**
 * Returns leaf angle, entrance progress, panel geometry, and label slot for
 * `TradeoffLeafOutline`, `TradeoffLeaf`.
 */
export function useTradeoffLeafPresentation({
  input,
  side,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const isGain = side === "gain";
  const isFirst = isGain === (input.revealOrder === "gain-first");
  const entrance = motion.ramp(
    frame,
    isFirst ? 36 : 72,
    motion.scale(isFirst ? 30 : 36),
    motion.travel.easing,
  );
  const angle = (isGain ? -7 : 7) * (1 - entrance);
  const x = isGain ? 54 : 498;
  const color = isGain ? accent : tokens.color.highlight;
  const panel = { x, y: 170, width: 408, height: 328, rx: scales.corner(16) };
  const label = {
    text: input.sideLabels[side],
    x: x + 204,
    y: 206,
    width: 344,
    fontSize: 18 as const,
    maxLines: 2,
  };
  return {
    input,
    side,
    tokens,
    scales,
    isGain,
    entrance,
    angle,
    x,
    color,
    panel,
    label,
  };
}
