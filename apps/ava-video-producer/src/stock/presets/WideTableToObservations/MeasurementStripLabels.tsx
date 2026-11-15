import { mix, ramp } from "../../../motion";
import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { missingMessage } from "./WideTableToObservations.controls";
import type { getMeasurementStripFromFrame } from "./getMeasurementStripFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getMeasurementStripFromFrame>;
  showSourceGuides: boolean;
  subjectIndex: number;
  measureIndex: number;
};
/** Key copies and values keep distinct readable lanes throughout travel. */
export function MeasurementStripLabels({
  scene,
  showSourceGuides,
  subjectIndex,
  measureIndex,
}: Readonly<Props>): ReactNode {
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
            value === null ? stockI18n._(missingMessage) : String(value),
            x + mix(progress, 174, 440),
            y,
            mix(progress, 70, 190),
            12,
            4,
          ],
        ]}
      />
      <g opacity={ramp(progress, 0.92, 0.08)}>
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
