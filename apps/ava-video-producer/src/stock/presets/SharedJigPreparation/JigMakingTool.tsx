import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  pattern: Input["guide"]["pattern"];
  accent: string;
};
/** The maker's free hand moves the cutting tool between the authored marks. */
export function JigMakingTool({
  frame,
  pattern,
  accent,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 20, 28, EASE.inOut);
  const x =
    pattern === "two-holes"
      ? mix(ramp(frame, 32, 4, EASE.inOut), 110, 150)
      : 80 + 22 * progress;
  const y = pattern === "two-holes" ? 382 : 350 + 22 * progress;
  return (
    <g>
      <path
        d={`M80 440 L40 315 L${x} ${y - 30}`}
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={3}
      />
      <path
        data-making-tool="true"
        d={`M${x} ${y - 30} V${y}`}
        stroke={accent}
        strokeWidth={4}
      />
      <circle
        data-making-hand="true"
        cx={x}
        cy={y - 30}
        r={5}
        fill={STOCK.orange}
      />
    </g>
  );
}
