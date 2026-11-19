import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  eventId: string;
  accountLabel: string;
  x: number;
  y: number;
  color: string;
};
/** A ledger imprint's corner before the corner style scales it. */
const IMPRINT_CORNER = 5;

/** The permanent ledger imprint retains the recorded account label. */
export function RecordedStamp({
  eventId,
  accountLabel,
  x,
  y,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-stamp-event={eventId} transform={`translate(${x} ${y})`}>
      <StockRect
        width={325}
        height={43}
        y={-9}
        rx={scales.corner(IMPRINT_CORNER)}
        fill={tokens.color.elevated}
        stroke={color}
      />
      <LabelSlots labels={[[accountLabel, 10, 7, 305, 12, 2]]} />
    </g>
  );
}
