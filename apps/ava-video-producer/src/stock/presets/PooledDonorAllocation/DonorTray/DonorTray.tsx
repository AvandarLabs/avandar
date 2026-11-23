import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getDonorTrayFromInputAndFrame } from "../getDonorTrayFromInputAndFrame";
import { DonorArm } from "./DonorArm";
import type { Input } from "../PooledDonorAllocation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; donorIndex: number };
/** The contributor's hand tips a small supported stack into the shared tray. */
export function DonorTray({
  input,
  frame,
  donorIndex,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const tray = getDonorTrayFromInputAndFrame({
    input,
    frame,
    donorIndex,
    motion,
  });
  const length = (input.contributions[donorIndex].credits - 1) * 32;
  const rightX = tray.x - 20 + (length + 40) * tray.cosine;
  const rightY = tray.y + (length + 40) * tray.sine + 22;
  return (
    <g>
      <PersonGlyph
        x={tray.x - 24}
        y={164}
        size={26}
        color={tokens.color.textMuted}
      />
      <g data-donor-tray={donorIndex}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${tray.x - 20} ${tray.y + 16} L${tray.x - 20} ${tray.y + 22} L${rightX} ${rightY} L${rightX} ${rightY - 6}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      </g>
      <DonorArm tray={tray} donorIndex={donorIndex} />
    </g>
  );
}
