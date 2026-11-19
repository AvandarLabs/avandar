import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import {
  MISSING_DASH,
  QUIET_CLASS_FILL_ALPHA,
} from "./ChoroplethClassBreaks.constants";
import type { ReactNode } from "react";

type Props = { text: string; y: number };
/**
 * The missing key uses the same muted fill and dashed stroke as a null tile.
 */
export function MissingClassKey({ text, y }: Readonly<Props>): ReactNode {
  const { color, stroke } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-missing-class-key="true"
        x={554}
        y={y - 11}
        width={14}
        height={14}
        fill={color.inactive}
        fillOpacity={QUIET_CLASS_FILL_ALPHA}
        stroke={color.inactive}
        strokeDasharray={MISSING_DASH}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <LabelSlots labels={[[text, 578, y, 322, 12, 2]]} />
    </g>
  );
}
