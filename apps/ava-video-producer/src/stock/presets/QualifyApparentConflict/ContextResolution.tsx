import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ContextQualifier } from "./ContextQualifier";
import { ContextQuestion } from "./ContextQuestion";
import type { Props } from "./QualifyApparentConflict";
import type { ReactNode } from "react";
/**
 * A divider establishes separate contexts before their joining qualification.
 */
export function ContextResolution({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const split = ramp(frame, 48, 36);
  const resolution = ramp(frame, 96, 24);
  const dividerOpacity =
    split * (input.showCentralDivider ? 1 : 1 - ramp(frame, 108, 12));
  return (
    <g>
      <ContextQuestion {...{ frame, input, accent, id: "question" }} />
      <line
        data-context-divider="true"
        x1={480}
        y1={mix(split, 270, 130)}
        y2={mix(split, 270, 410)}
        x2={480}
        stroke={STOCK.line}
        strokeWidth={2}
        opacity={dividerOpacity}
      />
      <path
        data-joining-brace="true"
        opacity={resolution}
        d="M250 408 V420 H466 Q480 420 480 434 Q480 420 494 420 H710 V408"
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <ContextQualifier {...{ frame, input, accent, id: "qualifier" }} />
    </g>
  );
}
