import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./QueueRelief.schema";
import type { ReactNode } from "react";
/** Inputs for QueueHeadings. */
type Props = { frame: number; input: Input };

/** Queue, completion and expansion captions label their respective regions. */
export function QueueHeadings({ frame, input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <g opacity={ramp(frame, 54, 18)}>
        <FitText
          text={input.capacityChangeLabel}
          x={44}
          y={50}
          width={872}
          fontSize={24}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <FitText
        text={input.queueLabel}
        x={44}
        y={105}
        width={276}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.completionLabel}
        x={648}
        y={105}
        width={276}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
