import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props as PaymentTraySharedProps } from "./PaymentTrayShared.types";
import type { ReactNode } from "react";

type Props = {
  payment: PaymentTraySharedProps["payment"];
  y: number;
  accent: string;
};

/** The participant's pointer to the first stated position with no token. */
export function GapPointer({ payment, y, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const targetX = 330 + payment.receivedUnits * 68;
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M250 160 H280 V${y - 26} H${targetX} L${targetX} ${y + 24}`,
      }}
      profile={tokens.sketch.shape}
      data-gap-point={payment.id}
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.heavy)}
    />
  );
}
