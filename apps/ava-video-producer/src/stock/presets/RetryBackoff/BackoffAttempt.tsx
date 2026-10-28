import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { BackoffFinal } from "./BackoffFinal";
import { BackoffLabel } from "./BackoffLabel";
import { BackoffWait } from "./BackoffWait";
import type { Input } from "./RetryBackoff.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  x: number;
  at: number;
  width: number;
  index: number;
  input: Input;
  accent: string;
};
/**
 * One attempt marker, proportional waiting bracket, and external label slots.
 */
export function BackoffAttempt({
  frame,
  x,
  at,
  width,
  index,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const attempt = input.attempts[index];
  const slotX = 40 + index * 220;
  const isFinal = index === input.attempts.length - 1;
  return (
    <g opacity={ramp(frame, index ? at - 8 : 12, 12)}>
      <circle
        data-attempt-index={index}
        cx={x}
        cy={310}
        r={10}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      {isFinal ? (
        <BackoffFinal outcome={attempt.outcome} x={x} />
      ) : (
        <BackoffWait input={input} index={index} x={x} width={width} />
      )}
      <path
        d={`M${x} 330 V388 L${slotX + 90} 410`}
        fill="none"
        stroke={STOCK.line}
      />
      <BackoffLabel input={input} index={index} accent={accent} />
    </g>
  );
}
