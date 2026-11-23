import { Motion } from "../../../motion";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DocumentTextRules } from "./DocumentTextRules/DocumentTextRules";
import type { Input } from "./DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  side: "saved" | "current";
};
/** Frames the current page takes to settle over the saved one. */
const SETTLE_FRAMES = 37;
/** Samples the saved or current page's authored settling origin. */
function _getPageOrigin({
  frame,
  side,
  motion,
}: Readonly<
  Pick<Props, "frame" | "side"> & {
    motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  }
>): { x: number; y: number } {
  const progress = Motion.ramp({
      frame,
      at: 13,
      dur: motion.scale(SETTLE_FRAMES),
      easing: motion.travel.easing,
    }),
    x = side === "saved" ? 52 : Motion.mix({ t: progress, from: 608, to: 508 }),
    y =
      side === "saved" ? 180 : Motion.mix({ t: progress, from: 196, to: 180 });
  return { x, y };
}

/** Page outlines retain the exact normalized region without label clamping. */
export function RegionPage({
  input,
  frame,
  accent,
  side,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, y } = _getPageOrigin({ frame, side, motion });
  const [left, top, right, bottom] = input.saved.box;
  return (
    <g>
      <StockRect
        data-page-outline={side}
        x={x}
        y={y}
        width={300}
        height={200}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <DocumentTextRules {...{ tokens, x, y }} />
      <StockRect
        data-saved-region={side}
        data-page={input.saved.page}
        x={x + left * 3}
        y={y + top * 2}
        width={(right - left) * 3}
        height={(bottom - top) * 2}
        fill={accent}
        fillOpacity={scales.wash(tokens.alpha.wash)}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
    </g>
  );
}
