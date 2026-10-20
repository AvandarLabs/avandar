import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./RejectAndReplace.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  accent: string;
  isReplacement: boolean;
  rejectionMark: Input["rejectionMark"];
};
/**
 * Rejection strikes only the selection marker. Rationale text remains
 * untouched.
 */
export function SelectionMarker({
  frame,
  accent,
  isReplacement,
  rejectionMark,
}: Readonly<Props>): ReactNode {
  const path =
    rejectionMark === "cross"
      ? "M-9 277 L9 295 M9 277 L-9 295"
      : "M-12 292 L12 280";
  return (
    <g>
      <circle
        cx={0}
        cy={286}
        r={9}
        fill="none"
        stroke={isReplacement ? accent : STOCK.muted}
        strokeWidth={2}
      />
      {isReplacement ? (
        <path
          d="M-22 274 h-8 v25 h8 M22 274 h8 v25 h-8"
          fill="none"
          stroke={accent}
          strokeWidth={2}
          opacity={ramp(frame, 108, 12)}
        />
      ) : (
        <g data-rejection-mark={rejectionMark} opacity={ramp(frame, 36, 12)}>
          <path d={path} fill="none" stroke={STOCK.orange} strokeWidth={3} />
        </g>
      )}
    </g>
  );
}
