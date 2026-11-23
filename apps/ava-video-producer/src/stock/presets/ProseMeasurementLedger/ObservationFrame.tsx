import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { roleMessages } from "./ProseMeasurementLedger.controls";
import type { getObservationSlotFromFrame } from "./getObservationSlotFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getObservationSlotFromFrame>;
  frame: number;
  accent: string;
};
/** One semantic slot reserves separate heading and complete-value rails. */
export function ObservationFrame({
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g opacity={motion.ramp(frame, 56, motion.scale(20))}>
      <StockRect
        x={scene.slotX}
        y={scene.slotY}
        width={268}
        height={100}
        rx={scales.corner(6)}
        fill="none"
        stroke={accent}
        strokeOpacity={tokens.alpha.guide}
      />
      <g opacity={scene.captionOpacity}>
        <LabelSlots
          labels={[
            [
              roleMessages[scene.role].message,
              scene.slotX + 12,
              scene.slotY + 20,
              244,
              12,
              1,
            ],
          ]}
        />
      </g>
    </g>
  );
}
