import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ScheduleBuffer.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** The authored result and deadline frame one fixed schedule endpoint. */
export function ScheduleBackdrop({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.resultLabel}
        x={40}
        y={64}
        width={880}
        fontSize={24}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.scheduleLabels.deadline}
        x={690}
        y={164}
        width={230}
        fontSize={16}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      <path
        data-deadline-pin="true"
        d="M920 225 V388 M912 225 H928"
        stroke={STOCK.text}
        strokeWidth={2}
      />
      <path
        d="M40 378 V388 H920"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={2}
      />
    </g>
  );
}
