import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Props } from "./QualifyApparentConflict";
import type { ReactNode } from "react";
/** The opening question holds between the two apparently conflicting claims. */
export function ContextQuestion({ frame, input }: Readonly<Props>): ReactNode {
  const resolution = ramp(frame, 96, 24);
  return (
    <>
      <g opacity={ramp(frame, 12, 18) * (1 - ramp(frame, 84, 18))}>
        <FitText
          text={input.openingLabel}
          x={480}
          y={66}
          width={840}
          fontSize={20}
          maxLines={2}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <text
        x={480}
        y={270}
        fill={STOCK.muted}
        fontSize={32}
        fontFamily="Arial, sans-serif"
        textAnchor="middle"
        opacity={1 - resolution}
        aria-hidden="true"
      >
        ?
      </text>
    </>
  );
}
