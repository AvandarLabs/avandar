import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getObservationSlotFromFrame } from "../getObservationSlotFromFrame";
import { ObservationFrame } from "../ObservationFrame";
import { roleMessages } from "../ProseMeasurementLedger.controls";
import { TravelingFragment } from "./TravelingFragment";
import type { Input } from "../ProseMeasurementLedger.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; index: number };
/** Exact selected text travels through a clear rail into one role slot. */
export function ObservationSlot({
  input,
  frame,
  accent,
  index,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scene = getObservationSlotFromFrame({ motion, input, frame, index });
  return (
    <g
      data-role={scene.role}
      data-value={scene.value}
      data-numeric-value={
        scene.role === "value" ? Number(scene.value) : undefined
      }
    >
      <ObservationFrame scene={scene} frame={frame} accent={accent} />
      <TravelingFragment scene={scene} />
    </g>
  );
}
