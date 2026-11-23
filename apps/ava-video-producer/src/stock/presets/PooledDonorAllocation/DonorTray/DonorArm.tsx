import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tray: Readonly<{ x: number; y: number }>;
  donorIndex: number;
};

/** The contributor's arm and the hand tipping the tray. */
export function DonorArm({ tray, donorIndex }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${tray.x - 24} 164 L${tray.x - 30} 175 L${tray.x - 20} ${tray.y + 22}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <circle
        data-donor-hand={donorIndex}
        cx={tray.x - 20}
        cy={tray.y + 22}
        r={3}
        fill={tokens.color.inactive}
      />
    </>
  );
}
