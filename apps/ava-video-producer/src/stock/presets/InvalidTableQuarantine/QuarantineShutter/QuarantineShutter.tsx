import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getQuarantineStateFromFrame } from "../getQuarantineStateFromFrame";
import type { Input } from "../InvalidTableQuarantine.schema";
import type { ReactNode } from "react";

const SLAT_STROKE = 8;
const SEE_THROUGH_SHUTTER = 0.87;
type Props = {
  input: Input;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  height: ReturnType<typeof getQuarantineStateFromFrame>["height"];
};
/** Closes the read shutter and retains its boundary slat. */
export function QuarantineShutter({
  input,
  tokens,
  scales,
  height,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        data-read-shutter="true"
        x={110}
        y={155}
        width={520}
        height={height}
        fill={tokens.color.ground}
        fillOpacity={input.showAttempt ? SEE_THROUGH_SHUTTER : 1}
        stroke={tokens.color.highlight}
      />
      {height > 0 ? (
        <g data-shutter-slat="true">
          <SketchedShape
            shape={{ kind: "path", d: `M110 ${155 + height} H630` }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.highlight}
            strokeWidth={scales.stroke(SLAT_STROKE)}
          />
        </g>
      ) : null}
    </>
  );
}
