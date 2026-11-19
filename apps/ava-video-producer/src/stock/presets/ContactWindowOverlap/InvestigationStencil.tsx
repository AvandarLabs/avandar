import { mix } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The supplied window lowers onto the same axis as each presence ribbon. */
export function InvestigationStencil({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const start =
    280 +
    630 *
      normalizeFiniteRange({
        value: input.investigationWindow.start,
        min: 0,
        max: input.axis.end,
      });
  const end =
    280 +
    630 *
      normalizeFiniteRange({
        value: input.investigationWindow.end,
        min: 0,
        max: input.axis.end,
      });
  return (
    <StockRect
      data-window="stencil"
      x={start}
      y={mix(
        motion.ramp(frame, 36, motion.scale(60), motion.travel.easing),
        85,
        195,
      )}
      width={end - start}
      height={270}
      fill={accent}
      fillOpacity={scales.wash(atomic.opacity["6"])}
      stroke={accent}
      strokeDasharray={tokens.dash.pending.join(" ")}
      opacity={motion.reveal(frame, 36)}
    />
  );
}
