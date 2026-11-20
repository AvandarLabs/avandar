import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getObservationSlotFromFrame } from "../getObservationSlotFromFrame";
import { roleMessages } from "../ProseMeasurementLedger.controls";
import type { ReactNode } from "react";
/** The selected text on its way to the slot, with its role's caption. */
export function TravelingFragment({
  scene,
}: Readonly<{
  scene: ReturnType<typeof getObservationSlotFromFrame>;
}>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g opacity={scene.opacity}>
      <rect
        data-transfer-role={scene.role}
        x={scene.x}
        y={scene.y - 18}
        width={244}
        height={70}
        fill={tokens.color.surface}
        fillOpacity={scene.progress * atomic.opacity["70"]}
      />
      <g opacity={scene.movingCaptionOpacity}>
        <LabelSlots
          labels={[
            [
              roleMessages[scene.role].message,
              scene.x,
              scene.y - 22,
              244,
              12,
              1,
            ],
          ]}
        />
      </g>
      <LabelSlots labels={[[scene.value, scene.x, scene.y, 244, 16, 3]]} />
    </g>
  );
}
