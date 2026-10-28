import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ResponseWriting } from "./ResponseWriting";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/**
 * A moving opaque fold reveals the response after the internal cartridge
 * ripple.
 */
export function PocketResponse({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 80, 28);
  return (
    <g>
      <rect
        data-internal-response="local"
        data-response-progress={progress}
        x={202}
        y={336}
        width={556}
        height={142}
        rx={3}
        fill={STOCK.surface}
        stroke={accent}
        strokeOpacity={progress}
      />
      <ResponseWriting {...{ input, accent }} />
      {progress < 1 ? (
        <rect
          data-response-fold="unfurling"
          x={203}
          y={336 + 142 * progress}
          width={554}
          height={142 * (1 - progress)}
          fill={STOCK.surface}
        />
      ) : undefined}
      <path
        d={`M202 336 h556 v${142 * progress}`}
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
    </g>
  );
}
