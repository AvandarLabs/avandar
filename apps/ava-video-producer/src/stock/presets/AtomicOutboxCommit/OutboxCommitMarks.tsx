import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** One shared latch closes before both commit stamps appear. */
export function OutboxCommitMarks({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const latchY = mix(ramp(frame, 56, 54, EASE.inOut), 128, 150);
  return (
    <g>
      {" "}
      <line
        data-commit-latch="true"
        x1={100}
        x2={860}
        y1={latchY}
        y2={latchY}
        stroke={accent}
        strokeWidth={4}
      />
      <path
        d={`M465 ${latchY} v-12 h30 v12`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      {input.outcome === "commit"
        ? [400, 840].map((x) => (
            <circle
              key={x}
              data-commit-stamp={x}
              cx={x}
              cy={490}
              r={9 * ramp(frame, 111, 28)}
              fill={accent}
            />
          ))
        : undefined}
    </g>
  );
}
