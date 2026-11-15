import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { Props } from "./ScopeAperture";
import type { ReactNode } from "react";
/** The broad subject stays visible until the focused question replaces it. */
export function ScopeHeading({ frame, input }: Readonly<Props>): ReactNode {
  return (
    <>
      <g opacity={ramp(frame, 12, 12) * (1 - ramp(frame, 72, 24))}>
        <FitText
          text={input.broadTopic}
          x={480}
          y={50}
          width={840}
          fontSize={24}
          maxLines={3}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
