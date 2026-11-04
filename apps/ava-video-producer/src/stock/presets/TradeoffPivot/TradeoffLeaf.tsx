import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { TradeoffPoints } from "./TradeoffPoints";
import type { Input } from "./TradeoffPivot.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  side: "gain" | "concession";
  frame: number;
  accent: string;
};
/**
 * Equal leaves unfold in authored order. The angle carries no numeric meaning.
 */
export function TradeoffLeaf({
  input,
  side,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const isGain = side === "gain";
  const isFirst = isGain === (input.revealOrder === "gain-first");
  const entrance = ramp(
    frame,
    isFirst ? 36 : 72,
    isFirst ? 30 : 36,
    EASE.inOut,
  );
  const angle = (isGain ? -7 : 7) * (1 - entrance);
  const x = isGain ? 54 : 498;
  const color = isGain ? accent : STOCK.orange;
  const panel = { x, y: 170, width: 408, height: 328, rx: 16 };
  const label = {
    text: input.sideLabels[side],
    x: x + 204,
    y: 206,
    width: 344,
    fontSize: 18 as const,
    maxLines: 2,
  };
  return (
    <g
      data-leaf={side}
      opacity={entrance}
      transform={`translate(480 170) rotate(${angle}) scale(${mix(entrance, 0.06, 1)} 1) translate(-480 -170)`}
    >
      <rect {...panel} fill={STOCK.surface} stroke={STOCK.line} />
      <path
        d={isGain ? "M462 184 H480" : "M480 184 H498"}
        stroke={color}
        strokeWidth={2}
      />
      <g aria-label={label.text}>
        <FitText
          {...label}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
          color={color}
        />
      </g>
      <TradeoffPoints
        points={isGain ? input.gains : input.concessions}
        x={x}
        color={color}
      />
    </g>
  );
}
