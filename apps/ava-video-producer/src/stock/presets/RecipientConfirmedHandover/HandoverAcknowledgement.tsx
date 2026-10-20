import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };

/**
 * The authored mark acknowledges the counted list after physical selection
 * ends.
 */
export function HandoverAcknowledgement({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={ramp(frame, 114, 12)}
      data-acknowledgement={input.acknowledgementMark}
    >
      <FitText
        text={input.receiptLabels.acknowledgement}
        x={718}
        y={510}
        width={188}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      {input.acknowledgementMark === "initials" ? (
        <FitText
          text={input.initialsText}
          x={860}
          y={552}
          width={60}
          fontSize={14}
          maxLines={1}
          normalizeWhitespace
          breakLongWords
        />
      ) : (
        <path
          d="M875 542 l9 8 l17 -18"
          stroke={accent}
          strokeWidth={3}
          fill="none"
        />
      )}
    </g>
  );
}
