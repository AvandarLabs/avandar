import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { missingMessage } from "./WideTableToObservations.controls";
import type { getMeasurementStripFromFrame } from "./getMeasurementStripFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getMeasurementStripFromFrame>;
  showSourceGuides: boolean;
  subjectIndex: number;
  measureIndex: number;
};
/**
 * The labels fade in over the last part of the strip's travel. Both values
 * are fractions of that travel, not frames, so tempo never scales them.
 */
const LABEL_REVEAL_AT = 0.92;
const LABEL_REVEAL_SPAN = 0.08;
/** Key copies and values keep distinct readable lanes throughout travel. */
export function MeasurementStripLabels({
  scene,
  showSourceGuides,
  subjectIndex,
  measureIndex,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const { x, y, progress, subject, measure, value } = scene;
  return (
    <g>
      {showSourceGuides ? (
        <LabelSlots
          labels={[
            [`${subjectIndex + 1}/${measureIndex + 1}`, x - 30, y, 28, 12, 1],
          ]}
        />
      ) : undefined}
      <LabelSlots
        labels={[
          [subject.label, x + 10, y, mix(progress, 150, 180), 12, 4],
          [
            value === null ? missingMessage.message : String(value),
            x + mix(progress, 174, 440),
            y,
            mix(progress, 70, 190),
            12,
            4,
          ],
        ]}
      />
      <g opacity={motion.ramp(progress, LABEL_REVEAL_AT, LABEL_REVEAL_SPAN)}>
        <LabelSlots
          labels={[
            [measure.label, x + mix(progress, 10, 218), y, 200, 12, 3],
            [measure.unit, x + mix(progress, 10, 650), y, 186, 12, 2],
          ]}
        />
      </g>
    </g>
  );
}
