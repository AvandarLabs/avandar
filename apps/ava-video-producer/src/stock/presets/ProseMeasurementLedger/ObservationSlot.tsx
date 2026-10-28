import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getObservationSlotFromFrame } from "./getObservationSlotFromFrame";
import { ObservationFrame } from "./ObservationFrame";
import { roleMessages } from "./ProseMeasurementLedger.controls";
import type { Input } from "./ProseMeasurementLedger.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string; index: number };
/** Exact selected text travels through a clear rail into one role slot. */
export function ObservationSlot({
  input,
  frame,
  accent,
  index,
}: Readonly<Props>): ReactNode {
  const scene = getObservationSlotFromFrame({ input, frame, index });
  return (
    <g
      data-role={scene.role}
      data-value={scene.value}
      data-numeric-value={
        scene.role === "value" ? Number(scene.value) : undefined
      }
    >
      <ObservationFrame scene={scene} frame={frame} accent={accent} />
      <g opacity={scene.opacity}>
        <rect
          data-transfer-role={scene.role}
          x={scene.x}
          y={scene.y - 18}
          width={244}
          height={70}
          fill={STOCK.surface}
          fillOpacity={scene.progress * 0.7}
        />
        <g opacity={scene.movingCaptionOpacity}>
          <LabelSlots
            labels={[
              [
                stockI18n._(roleMessages[scene.role]),
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
    </g>
  );
}
