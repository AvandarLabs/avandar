import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** A bin bar's tint, before the theme's tint strength. */
const BAR_TINT = 0.18;
/** The dash of the count a bin held before backfill. */
const PRIOR_DASH = "5 3";
type Props = {
  id: string;
  label: string;
  index: number;
  width: number;
  prior: number;
  revised: number;
  height: number;
  showPrior: boolean;
  accent: string;
};
/** Bar area and the retained outline share the same event-date baseline. */
export function BackfillBar({
  id,
  label,
  index,
  width,
  prior,
  revised,
  height,
  showPrior,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const x = 68 + index * width + 12;
  return (
    <g data-bin={id} data-prior={prior} data-revised={revised}>
      <rect
        data-bin-bar={id}
        x={x}
        y={480 - height}
        width={width - 24}
        height={height}
        fill={accent}
        fillOpacity={scales.wash(BAR_TINT)}
      />
      {showPrior ? (
        <StockRect
          data-prior-outline={id}
          x={x}
          y={480 - prior * 18}
          width={width - 24}
          height={prior * 18}
          fill="none"
          stroke={tokens.color.highlight}
          strokeDasharray={PRIOR_DASH}
        />
      ) : undefined}
      <LabelSlots
        labels={[[label, 68 + index * width, 505, width - 10, 12, 4]]}
      />
    </g>
  );
}
