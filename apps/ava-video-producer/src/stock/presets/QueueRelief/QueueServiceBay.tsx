import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./QueueRelief.schema";
import type { ReactNode } from "react";

type Props = {
  slot: Input["serviceSlots"][number];
  index: number;
  expansion: number;
  accent: string;
};
/** The dash of a service bay that is not open yet. */
const CLOSED_BAY_DASH = "5 5";
/** A named closed outline expands to full usable service capacity. */
export function QueueServiceBay({
  slot,
  index,
  expansion,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-slot-id={slot.id}
        data-open={slot.initiallyOpen || expansion === 1}
        x={344}
        y={154 + index * 100}
        width={slot.initiallyOpen ? 272 : mix(expansion, 48, 272)}
        height={90}
        rx={scales.corner(6)}
        fill={tokens.color.surface}
        stroke={slot.initiallyOpen ? accent : tokens.color.highlight}
        strokeDasharray={
          slot.initiallyOpen || expansion === 1 ? undefined : CLOSED_BAY_DASH
        }
      />
      <FitText
        text={slot.label}
        x={356}
        y={174 + index * 100}
        width={248}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
