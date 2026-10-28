import { ramp } from "../../../motion";
import { DrawPath } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./RejectAndReplace.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** A stated criterion and unchanged selection slot explain the replacement. */
export function SelectionCriterion({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const label = {
    text: input.criterion,
    x: 480,
    y: 60,
    width: 840,
    fontSize: 24 as const,
    maxLines: 3,
  };
  const slot = { x: 312, y: 202, width: 336, height: 320, rx: 22 };
  return (
    <g>
      <g opacity={ramp(frame, 12, 18)} aria-label={input.criterion}>
        <FitText
          {...label}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
        />
      </g>
      <rect
        {...slot}
        fill="none"
        stroke={STOCK.line}
        strokeDasharray="4 6"
        opacity={ramp(frame, 18, 18)}
      />
      {input.showCriterionLink ? (
        <g data-criterion-link="replacement" opacity={ramp(frame, 108, 12)}>
          <DrawPath
            d="M480 145 V176 H674 V444 H624"
            frame={frame}
            at={108}
            duration={12}
            color={accent}
          />
        </g>
      ) : null}
    </g>
  );
}
