import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useTradeoffLeafPresentation } from "./useTradeoffLeafPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useTradeoffLeafPresentation>,
  "isGain" | "tokens" | "color" | "scales"
>;
/** Render the tradeoff leaf outline. */
export function TradeoffLeafOutline(props: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: props.isGain ? "M462 184 H480" : "M480 184 H498",
      }}
      profile={props.tokens.sketch.shape}
      stroke={props.color}
      strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
    />
  );
}
