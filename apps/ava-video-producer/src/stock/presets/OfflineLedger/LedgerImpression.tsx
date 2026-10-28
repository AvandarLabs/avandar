import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  entryId: string;
  index: number;
  frame: number;
  accent: string;
  isVisible: boolean;
};
/**
 * A shallow engraved impression remains after its matching entry is written.
 */
export function LedgerImpression({
  entryId,
  index,
  frame,
  accent,
  isVisible,
}: Readonly<Props>): ReactNode {
  const impression = ramp(frame, 44 + index * 16, 6);
  if (!isVisible || frame < 44 + index * 16) {
    return undefined;
  }
  return (
    <g
      data-local-impression={entryId}
      transform={`translate(${220 + index * 136} ${mix(impression, 422, 448)})`}
      opacity={impression}
    >
      <path
        d="M0 0 h112 v22 h-112 z"
        fill={STOCK.elevated}
        stroke={accent}
        strokeOpacity={0.55}
      />
      <path d="M12 8 h82 M12 14 h56" stroke={accent} strokeWidth={2} />
    </g>
  );
}
