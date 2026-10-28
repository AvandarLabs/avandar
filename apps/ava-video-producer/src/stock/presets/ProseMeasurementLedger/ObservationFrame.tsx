import { ramp } from "../../../motion";
import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
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
  return (
    <g opacity={ramp(frame, 56, 20)}>
      <rect
        x={scene.slotX}
        y={scene.slotY}
        width={268}
        height={100}
        rx={6}
        fill="none"
        stroke={accent}
        strokeOpacity={0.5}
      />
      <g opacity={scene.captionOpacity}>
        <LabelSlots
          labels={[
            [
              stockI18n._(roleMessages[scene.role]),
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
