import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { EnvelopeCover } from "./EnvelopeCover";
import type { Input } from "./SealedHandoff.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** Physical flaps finish in an opaque cover before travel can begin. */
export function EnvelopeFlaps({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const lower = ramp(frame, 36, 12);
  const sides = ramp(frame, 44, 12);
  const final = ramp(frame, 56, 10);
  const opening = input.revealRule === "recipient" ? ramp(frame, 120, 16) : 0;
  const coverProgress = frame < 66 ? final : 1 - opening;
  return (
    <g data-cover-progress={coverProgress}>
      <path
        d={`M0 266 L268 ${mix(lower * (1 - opening), 350, 134)} L536 266 z`}
        fill={STOCK.elevated}
        stroke={STOCK.line}
      />
      <path
        d={`M0 0 L${mix(sides * (1 - opening), -36, 268)} 133 L0 266 z M536 0 L${mix(sides * (1 - opening), 572, 268)} 133 L536 266 z`}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      {frame >= 66 ? <EnvelopeCover opening={opening} /> : undefined}
      {frame >= 56 ? (
        <path
          data-final-flap="opaque"
          d={`M0 0 L268 ${mix(final * (1 - opening), -84, 134)} L536 0 z`}
          fill={STOCK.surface}
          stroke={accent}
        />
      ) : undefined}
      {frame >= 66 && opening === 0 ? (
        <path
          d="M0 266 L268 134 L536 266 M0 0 L268 134 L536 0"
          fill="none"
          stroke={STOCK.line}
        />
      ) : undefined}
    </g>
  );
}
