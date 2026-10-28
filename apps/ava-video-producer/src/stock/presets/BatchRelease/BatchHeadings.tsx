import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./BatchRelease.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Intake, dispatch, and destination captions frame the batch journey. */
export function BatchHeadings({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.intakeLabel}
        x={40}
        y={64}
        width={400}
        fontSize={20}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.destinationLabel}
        x={550}
        y={64}
        width={370}
        fontSize={20}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.boundaryLabel}
        x={424}
        y={142}
        width={152}
        fontSize={14}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
        color={STOCK.muted}
      />
      <path
        data-dispatch-boundary="true"
        d="M500 200 V580"
        fill="none"
        stroke={STOCK.muted}
        strokeDasharray="6 8"
      />
    </g>
  );
}
