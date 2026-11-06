import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";
/** Inputs for ComplaintPlacement. */
type Props = { frame: number; input: Input; accent: string };

/** The participant places an optional persistent complaint marker. */
export function ComplaintPlacement({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const complaint = ramp(frame, 32, 10);
  return (
    <g>
      {" "}
      {input.showComplaintMarker && frame >= 32 ? (
        <g>
          <circle
            data-complaint-marker="retained"
            cx={mix(complaint, 220, 320)}
            cy={mix(complaint, 325, 415)}
            r={14}
            fill={STOCK.surface}
            stroke={STOCK.orange}
            strokeWidth={3}
          />
          {frame <= 42 ? (
            <path
              data-complaint-hand="participant"
              d={`M200 310 L${mix(complaint, 220, 320)} ${mix(complaint, 325, 415)}`}
              fill="none"
              stroke={accent}
              strokeWidth={4}
            />
          ) : undefined}
        </g>
      ) : undefined}
    </g>
  );
}
