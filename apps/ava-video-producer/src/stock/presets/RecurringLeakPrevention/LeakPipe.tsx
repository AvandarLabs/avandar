import { loopPhase, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Normal outlet flow is independently visible from the side leak. */
export function LeakPipe({ input, frame, accent }: Readonly<Props>): ReactNode {
  const running = frame < 63 || (frame >= 107 && input.retest !== "not-tested");
  const leaking =
    frame < 63 || (frame >= 107 && input.retest === "still-leaking");
  return (
    <g opacity={ramp(frame, 12, 12)}>
      <path
        d="M200 245 H750 V340 M200 275 H720 V340"
        stroke={STOCK.line}
        strokeWidth={7}
        fill="none"
      />
      <path d="M473 235 v50 M487 235 v50" stroke={accent} strokeWidth={5} />
      <path d="M720 340 h30" stroke={STOCK.muted} strokeWidth={6} />
      {running ? (
        <g data-outlet-flow="true">
          <path
            d="M220 260 H735 V430"
            stroke={STOCK.cyan}
            strokeWidth={5}
            strokeDasharray="12 12"
            strokeDashoffset={-loopPhase(frame, 48) * 48}
            fill="none"
          />
          <path d="M720 440 h30" stroke={STOCK.cyan} strokeWidth={3} />
        </g>
      ) : undefined}
      {leaking ? (
        <g data-side-leak="true">
          {[0, 1, 2].map((index) => (
            <circle
              key={index}
              cx={480}
              cy={300 + loopPhase(frame, 30, index * 10) * 110}
              r={4}
              fill={STOCK.cyan}
            />
          ))}
        </g>
      ) : undefined}
    </g>
  );
}
