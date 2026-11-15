import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Props } from "./ScopeAperture";
import type { ReactNode } from "react";
/** An authored caption qualifies the topics outside the current explanation. */
export function OutsideCaption({ frame, input }: Readonly<Props>): ReactNode {
  return (
    <>
      <g data-outside-caption="true" opacity={ramp(frame, 108, 12)}>
        <FitText
          text={input.outsideLabel}
          x={480}
          y={552}
          width={840}
          fontSize={18}
          maxLines={1}
          anchor="middle"
          color={STOCK.muted}
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
