import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";
type Props = {
  x: number;
  y: number;
  frame: number;
  input: Input;
  accent: string;
};
/** A request key returns with a result impression only after retrieval. */
export function CacheLookupToken({
  x,
  y,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const hasResult =
    (frame >= 60 && frame <= 92) || (frame >= 120 && frame <= 138);
  const resultOpacity =
    frame < 102
      ? ramp(frame, 60, 4) * (1 - ramp(frame, 88, 4))
      : ramp(frame, 120, 4) * (1 - ramp(frame, 134, 4));
  return (
    <g>
      <circle
        data-lookup-token={input.request.key}
        cx={x}
        cy={y}
        r={8}
        fill={accent}
      />
      {hasResult ? (
        <path
          data-carried-result={input.result.value}
          aria-label={input.result.label}
          opacity={resultOpacity}
          d={`M${x + 14} ${y - 12} h20 v24 h-20 Z M${x + 18} ${y - 5} h12 M${x + 18} ${y + 1} h12 M${x + 18} ${y + 7} h8`}
          fill={STOCK.surface}
          stroke={STOCK.orange}
          strokeWidth={1.5}
        />
      ) : undefined}
    </g>
  );
}
