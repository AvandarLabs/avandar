import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CorrectionHand } from "./CorrectionHand";
import type { ReactNode } from "react";

type Props = {
  paymentId: string;
  unitIndex: number;
  x: number;
  y: number;
  isOriginal: boolean;
  isHandling: boolean;
  accent: string;
};
/** Original solids and correction stripes remain visually distinct. */
export function ReceivedToken({
  paymentId,
  unitIndex,
  x,
  y,
  isOriginal,
  isHandling,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g
      data-unit-kind={isOriginal ? "original" : "correction"}
      data-unit={unitIndex}
    >
      <circle
        data-payment-token={paymentId}
        cx={x}
        cy={y}
        r={18}
        fill={isOriginal ? accent : tokens.color.accentAlt}
      />
      {!isOriginal ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x - 9} ${y + 7} l16 -16 M${x - 2} ${y + 12} l13 -13`,
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.ground}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      ) : undefined}
      {isHandling ? (
        <CorrectionHand paymentId={paymentId} x={x} y={y} />
      ) : undefined}
    </g>
  );
}
