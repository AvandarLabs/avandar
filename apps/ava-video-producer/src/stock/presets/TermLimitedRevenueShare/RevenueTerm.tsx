import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** The authored boundary turns and closes only the distribution outlet. */
export function RevenueTerm({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const turning = ramp(frame, 66, 29, EASE.inOut);
  const x = input.arrangementLayout === "stacked" ? 590 : 460;
  const y = input.arrangementLayout === "stacked" ? 240 : 355;
  return (
    <g>
      <g
        data-term-turn="true"
        transform={`translate(${x} ${y}) rotate(${mix(turning, 0, 90)})`}
      >
        <path d="M-18 0 H18 M0 -18 V18" stroke={STOCK.orange} strokeWidth={4} />
        <path d="M-16 -18 Q24 -18 24 12" stroke={STOCK.orange} fill="none" />
      </g>
      <path
        data-outlet="distribution"
        data-closed={turning === 1}
        d={`M${x - 15} ${y + 32} L${x + 15} ${y + 32 - mix(turning, 28, 0)}`}
        stroke={STOCK.orange}
        strokeWidth={5}
      />
      <LabelSlots
        labels={[
          [
            input.arrangement.termBoundaryLabel,
            input.arrangementLayout === "stacked" ? 640 : 480,
            y + 10,
            input.arrangementLayout === "stacked" ? 260 : 420,
            14,
            4,
          ],
        ]}
      />
    </g>
  );
}
