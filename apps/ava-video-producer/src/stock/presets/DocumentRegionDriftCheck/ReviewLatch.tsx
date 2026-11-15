import { ramp, mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; matched: boolean };
/**
 * A mismatching source closes the review latch instead of replacing content.
 */
export function ReviewLatch({
  input,
  frame,
  accent,
  matched,
}: Readonly<Props>): ReactNode {
  const closure = ramp(frame, 101, 38),
    gap = matched ? mix(closure, 32, 18) : mix(closure, 32, 0);
  return (
    <g>
      <path
        data-review-latch="left"
        d={`M${480 - gap} 260 v36 h${gap}`}
        stroke={matched ? accent : STOCK.orange}
        fill="none"
        strokeWidth={5}
      />
      <path
        data-review-latch="right"
        d={`M${480 + gap} 260 v36 h${-gap}`}
        stroke={matched ? accent : STOCK.orange}
        fill="none"
        strokeWidth={5}
      />
      <g opacity={closure}>
        <LabelSlots
          labels={[
            [
              matched ? input.labels.matched : input.labels.review,
              52,
              500,
              856,
              18,
              2,
            ],
          ]}
        />
      </g>
    </g>
  );
}
