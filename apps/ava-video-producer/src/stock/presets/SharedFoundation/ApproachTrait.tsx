import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SharedFoundation.schema";
import type { ReactNode } from "react";
/** Inputs for ApproachTrait. */
type Props = {
  frame: number;
  approach: Input["approaches"][number];
  index: number;
  x: number;
  showTrait: boolean;
};

/** A distinguishing trait stays attached to its approach during the reveal. */
export function ApproachTrait({
  frame,
  approach,
  index,
  x,
  showTrait,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g
        {...{ [`data-trait-${index}`]: true }}
        opacity={showTrait ? 1 : 1 - ramp(frame, 96, 24)}
      >
        <FitText
          text={approach.distinction}
          x={x + 180}
          y={285}
          width={320}
          fontSize={16}
          maxLines={3}
          anchor="middle"
          color={STOCK.muted}
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
