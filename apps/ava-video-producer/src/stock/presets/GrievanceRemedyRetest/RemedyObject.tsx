import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { LampObject } from "./LampObject";
import { LockerObject } from "./LockerObject";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** A latch closes or a lamp lights only for the supplied functioning retest. */
export function RemedyObject({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const functioning =
    input.testResults.after === "functioning" ? ramp(frame, 98, 10) : 0;
  const attempt =
    8 * Math.sin(Math.PI * ramp(frame, 20, 10)) +
    (input.testResults.after !== "not-tested"
      ? 8 * Math.sin(Math.PI * ramp(frame, 98, 10))
      : 0);
  const replacement = ramp(frame, 56, 22);
  const isLamp = input.object.kind === "desk-lamp";
  const objectState =
    frame >= 108 ? input.testResults.after : "not-functioning";
  return (
    <g data-object-state={objectState}>
      {isLamp ? (
        <LampObject functioning={functioning} accent={accent} />
      ) : (
        <LockerObject functioning={functioning} accent={accent} />
      )}
      <path
        data-old-part="retained"
        d={`M${mix(replacement, 560, 615)} ${mix(replacement, 322, 410)} l-10 16`}
        stroke={STOCK.orange}
        strokeWidth={6}
      />
      <rect
        data-replacement-part="worker"
        x={mix(replacement, 730, 550)}
        y={mix(replacement, 365, 321)}
        width={24}
        height={18}
        rx={3}
        fill={STOCK.cyan}
        opacity={ramp(frame, 44, 8)}
      />
      <path
        data-object-operation="handle"
        d={`M560 330 l${isLamp ? 12 : 14} ${mix(functioning, 12, 0) - attempt}`}
        stroke={accent}
        strokeWidth={4}
      />
    </g>
  );
}
