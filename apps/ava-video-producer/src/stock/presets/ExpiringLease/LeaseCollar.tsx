import type { Input } from "./ExpiringLease.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  x: number;
  y: number;
  accent: string;
};
/** A finite collar drops one authored segment at each evenly spaced beat. */
export function LeaseCollar({
  input,
  frame,
  x,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  const elapsed = Math.min(
    input.lifetime.value,
    Math.max(0, Math.floor((frame - 36) / (72 / input.lifetime.value))),
  );
  return (
    <g>
      {Array.from({ length: input.lifetime.value }, (_, segment) => {
        const angle =
          (segment * Math.PI * 2) / input.lifetime.value - Math.PI / 2;
        const end = angle + ((Math.PI * 2) / input.lifetime.value) * 0.72;
        const d = `M${x + Math.cos(angle) * 46} ${y + Math.sin(angle) * 46} A46 46 0 ${end - angle > Math.PI ? 1 : 0} 1 ${x + Math.cos(end) * 46} ${y + Math.sin(end) * 46}`;
        const appearance = {
          d,
          fill: "none",
          stroke: accent,
          strokeWidth: 5,
          strokeOpacity: segment >= elapsed ? 1 : 0.12,
          strokeLinecap: "round" as const,
        };
        return (
          <path
            key={segment}
            data-lifetime-segment={segment}
            data-active={segment >= elapsed}
            {...appearance}
          />
        );
      })}
    </g>
  );
}
