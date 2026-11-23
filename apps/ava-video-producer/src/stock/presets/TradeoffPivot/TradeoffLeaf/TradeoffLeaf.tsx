import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { StockRect } from "../../../primitives/StockRect";
import { TradeoffPoints } from "../TradeoffPoints";
import { TradeoffLeafOutline } from "./TradeoffLeafOutline";
import { useTradeoffLeafPresentation } from "./useTradeoffLeafPresentation";
import type { Input } from "../TradeoffPivot.schema.ts";
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
export function TradeoffLeaf(props: Readonly<Props>): ReactNode {
  const presentation = useTradeoffLeafPresentation(props);

  return (
    <g
      data-leaf={props.side}
      opacity={presentation.entrance}
      transform={`translate(480 170) rotate(${presentation.angle}) scale(${Motion.mix(
        {
          t: presentation.entrance,
          from: 0.06,
          to: 1,
        },
      )} 1) translate(-480 -170)`}
    >
      <StockRect
        {...presentation.panel}
        fill={presentation.tokens.color.surface}
        stroke={presentation.tokens.color.line}
      />
      <TradeoffLeafOutline {...presentation} />
      <g aria-label={presentation.label.text}>
        <FitText
          {...presentation.label}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
          color={presentation.color}
        />
      </g>
      <TradeoffPoints
        points={
          presentation.isGain ? props.input.gains : props.input.concessions
        }
        x={presentation.x}
        color={presentation.color}
      />
    </g>
  );
}
