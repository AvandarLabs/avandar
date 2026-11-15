import { EASE, mix, ramp } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The supplied window lowers onto the same axis as each presence ribbon. */
export function InvestigationStencil({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const start =
    280 +
    630 *
      normalizeFiniteRange({
        value: input.investigationWindow.start,
        min: 0,
        max: input.axis.end,
      });
  const end =
    280 +
    630 *
      normalizeFiniteRange({
        value: input.investigationWindow.end,
        min: 0,
        max: input.axis.end,
      });
  return (
    <rect
      data-window="stencil"
      x={start}
      y={mix(ramp(frame, 36, 60, EASE.inOut), 85, 195)}
      width={end - start}
      height={270}
      fill={accent}
      fillOpacity={0.06}
      stroke={accent}
      strokeDasharray="4 4"
      opacity={ramp(frame, 36, 12)}
    />
  );
}
