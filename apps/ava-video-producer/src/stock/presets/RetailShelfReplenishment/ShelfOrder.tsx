import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
  useGraphicMotion,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getOrderSlipPoseFromFrame } from "./getOrderSlipPoseFromFrame";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** The retailer places a visible authored request on the counter. */
export function ShelfOrder({ input, frame }: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const slip = getOrderSlipPoseFromFrame(frame, motion);
  return (
    <g>
      {" "}
      <SketchedShape
        shape={{ kind: "path", d: "M565 292 H670" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      {input.showOrderSlip ? (
        <g data-order-slip transform={`translate(${slip.x} ${slip.y})`}>
          <StockRect
            width={72}
            height={24}
            fill={tokens.color.surface}
            stroke={tokens.color.highlight}
          />
          <SketchedShape
            shape={{ kind: "path", d: "M8 8 H60 M8 16 H45" }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.highlight}
          />
        </g>
      ) : undefined}
      {input.showOrderSlip ? (
        <FitText
          text={input.labels.order}
          x={42}
          y={80}
          width={470}
          fontSize={14}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
        />
      ) : undefined}
    </g>
  );
}
