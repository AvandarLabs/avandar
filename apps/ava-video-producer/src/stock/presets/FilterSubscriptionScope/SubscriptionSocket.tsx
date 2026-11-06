import { ramp, mix, EASE } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The category strip moves into a fixed subscription source socket. */
export function SubscriptionSocket({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const socket = mix(ramp(frame, 51, 39, EASE.inOut), 48, 354);
  return (
    <g>
      <rect
        data-filter-socket="true"
        x={354}
        y={102}
        width={250}
        height={32}
        rx={8}
        fill="none"
        stroke={STOCK.line}
      />
      <g data-filter="true" data-x={socket}>
        <rect
          x={socket}
          y={102}
          width={250}
          height={32}
          rx={8}
          fill={STOCK.elevated}
          stroke={accent}
        />
        <LiteralDataText
          value={input.selectedCategory}
          x={socket + 16}
          y={124}
        />
      </g>
    </g>
  );
}
