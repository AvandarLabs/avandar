import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const attempt = input.attempts[index];
  const slotX = 40 + index * 220;
  const isFinal = index === input.attempts.length - 1;
  return (
    <g opacity={motion.reveal(frame, index ? at - 8 : 12)}>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: 310, r: 10 }}
        profile={tokens.sketch.shape}
        data-attempt-index={index}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {isFinal ? (
        <BackoffFinal outcome={attempt.outcome} x={x} />
      ) : (
        <BackoffWait input={input} index={index} x={x} width={width} />
      )}
      <SketchedShape
        shape={{ kind: "path", d: `M${x} 330 V388 L${slotX + 90} 410` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
      />
      <BackoffLabel input={input} index={index} accent={accent} />
    </g>
  );
}
