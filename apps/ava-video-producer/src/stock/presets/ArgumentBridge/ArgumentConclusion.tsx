import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Props } from "./ArgumentBridge";
import type { ReactNode } from "react";
/** The authored conclusion rises above the completed support deck. */
export function ArgumentConclusion({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  const conclusion = ramp(frame, 84, 24, EASE.inOut);
  return (
    <>
      <g
        data-conclusion="true"
        opacity={conclusion}
        transform={`translate(0 ${mix(conclusion, 18, 0)})`}
      >
        <FitText
          text={input.conclusion}
          x={480}
          y={162}
          width={800}
          fontSize={24}
          maxLines={4}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
        <path d="M400 266 H560 M480 266 V278" stroke={STOCK.line} fill="none" />
      </g>
    </>
  );
}
