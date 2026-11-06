import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Props } from "./ArgumentBridge";
import type { ReactNode } from "react";
/** Connective language follows the separately readable authored premises. */
export function ArgumentConnector({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g data-connector="true" opacity={ramp(frame, 60, 18)}>
        <FitText
          text={input.connectorText}
          x={480}
          y={294}
          width={800}
          fontSize={18}
          maxLines={2}
          color={STOCK.mint}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
