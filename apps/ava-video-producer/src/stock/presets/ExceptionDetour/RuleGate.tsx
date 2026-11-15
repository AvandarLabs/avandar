import { ramp, mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { StandardOutcome } from "./StandardOutcome";
import type { Props } from "./ExceptionDetour";
import type { ReactNode } from "react";
/** The normal rule stays complete while a side latch opens for one case. */
export function RuleGate({ frame, accent, input }: Readonly<Props>): ReactNode {
  const opening = ramp(frame, 48, 12);
  const side = input.detourSide === "above" ? -1 : 1;
  return (
    <g opacity={ramp(frame, 12, 18)}>
      <FitText
        text={input.rule.label}
        x={480}
        y={50}
        width={840}
        fontSize={24}
        maxLines={3}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <path
        data-standard-route="true"
        d="M100 300 H880"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={3}
      />
      <path d="M420 250 V350" stroke={accent} strokeWidth={3} />
      <path
        data-side-latch="true"
        d="M420 300 H462"
        stroke={STOCK.orange}
        strokeWidth={4}
        transform={`rotate(${mix(opening, 0, side * 62)} 420 300)`}
      />
      <StandardOutcome input={input} />
      {input.showStandardReference ? (
        <circle
          data-standard-reference="true"
          cx={865}
          cy={300}
          r={7}
          fill={STOCK.muted}
        />
      ) : null}
    </g>
  );
}
