import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const isGain = side === "gain";
  const isFirst = isGain === (input.revealOrder === "gain-first");
  const entrance = motion.ramp(
    frame,
    isFirst ? 36 : 72,
    isFirst ? 30 : 36,
    motion.travel.easing,
  );
  const angle = (isGain ? -7 : 7) * (1 - entrance);
  const x = isGain ? 54 : 498;
  const color = isGain ? accent : tokens.color.highlight;
  const panel = { x, y: 170, width: 408, height: 328, rx: scales.corner(16) };
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
      <StockRect
        {...panel}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: isGain ? "M462 184 H480" : "M480 184 H498" }}
        profile={tokens.sketch.shape}
        stroke={color}
        strokeWidth={scales.stroke(tokens.stroke.default)}
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
