import { DrawPath } from "../../../graphics-common/DrawPath";
import { FitText } from "../../../primitives/FitText/FitText";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CriterionLabel } from "./CriterionLabel";
import { CriterionLink } from "./CriterionLink";
import type { Input } from "../RejectAndReplace.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** A stated criterion and unchanged selection slot explain the replacement. */
export function SelectionCriterion({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const slot = {
    x: 312,
    y: 202,
    width: 336,
    height: 320,
    rx: scales.corner(22),
  };
  return (
    <g>
      <CriterionLabel criterion={input.criterion} frame={frame} />
      <StockRect
        {...slot}
        fill="none"
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.spaced.join(" ")}
        opacity={motion.ramp(frame, 18, motion.hero)}
      />
      {input.showCriterionLink ? (
        <CriterionLink frame={frame} accent={accent} />
      ) : null}
    </g>
  );
}
