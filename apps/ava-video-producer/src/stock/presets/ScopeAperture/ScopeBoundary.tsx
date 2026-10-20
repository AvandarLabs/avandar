import { StockRect } from "../../primitives/StockRect/StockRect";
import { EASE, mix, ramp } from "../../../motion";
import { FocusedQuestion } from "./FocusedQuestion";
import { OutsideCaption } from "./OutsideCaption";
import { ScopeHeading } from "./ScopeHeading";
import type { Props } from "./ScopeAperture";
import type { ReactNode } from "react";
/** The full-field frame contracts around one explicitly authored question. */
export function ScopeBoundary({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const contraction = ramp(frame, 36, 72, EASE.inOut);
  return (
    <g>
      <ScopeHeading {...{ frame, input, accent, id: "heading" }} />
      <StockRect
        data-aperture="true"
        x={mix(contraction, 60, 240)}
        y={mix(contraction, 140, 150)}
        width={mix(contraction, 840, 480)}
        height={mix(contraction, 380, 360)}
        rx={8}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - ramp(frame, 20, 16)}
      />
      <FocusedQuestion {...{ frame, input, accent, id: "question" }} />
      <OutsideCaption {...{ frame, input, accent, id: "outside" }} />
    </g>
  );
}
