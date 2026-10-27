import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string; toolX: number };
/**
 * A shared table supports a visibly handled folding guide or alignment ruler.
 */
export function ExpertiseWorktable({
  input,
  frame,
  accent,
  toolX,
}: Readonly<Props>): ReactNode {
  const topic = input.topics[frame < 83 ? 0 : 1];
  const demonstration = ramp(frame, frame < 83 ? 35 : 103, 22);
  return (
    <g opacity={ramp(frame, 16, 12)}>
      <path
        d="M290 330 H675 V356 H290 Z M320 356 V390 M655 356 V390"
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={3}
      />
      <rect
        x={350}
        y={312}
        width={260}
        height={16}
        fill="none"
        stroke={STOCK.muted}
      />
      <g opacity={ramp(frame, 35, 9)}>
        <rect
          data-demonstration-tool={topic.demonstration}
          x={toolX}
          y={325}
          width={90}
          height={8}
          rx={2}
          fill={accent}
        />
        {topic.demonstration === "fold-guide" ? (
          <path
            d={`M${toolX} 325 l${45 * demonstration} -24 h45 l${-45 * demonstration} 24`}
            fill={STOCK.surface}
            stroke={accent}
            strokeWidth={2}
          />
        ) : (
          <path
            d={`M${toolX + 6} 317 h78 M${toolX + 12} 317 v8 M${toolX + 30} 317 v8 M${toolX + 48} 317 v8 M${toolX + 66} 317 v8`}
            stroke={accent}
            fill="none"
            strokeWidth={2}
          />
        )}
      </g>
    </g>
  );
}
