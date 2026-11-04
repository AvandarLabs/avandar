import { STOCK } from "../../stockPalette";
import { getMeasurementStripFromFrame } from "./getMeasurementStripFromFrame";
import { MeasurementStripLabels } from "./MeasurementStripLabels";
import type { Input } from "./WideTableToObservations.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  subjectIndex: number;
  measureIndex: number;
};
/** Each measurement peels away carrying its subject, measure and unit. */
export function MeasurementStrip({
  input,
  frame,
  accent,
  subjectIndex,
  measureIndex,
}: Readonly<Props>): ReactNode {
  const scene = getMeasurementStripFromFrame({
    input,
    frame,
    subjectIndex,
    measureIndex,
  });
  return (
    <g opacity={scene.opacity}>
      <rect
        data-transfer-measurement={`${subjectIndex}:${measureIndex}`}
        data-observation={
          !scene.isOmitted
            ? `${scene.subject.id}:${scene.measure.id}`
            : undefined
        }
        data-missing={scene.value === null ? "true" : undefined}
        data-subject-id={scene.subject.id}
        data-measure-id={scene.measure.id}
        data-source-value={scene.value ?? "missing"}
        x={scene.x}
        y={scene.y - 22}
        width={scene.width}
        height={76}
        fill={STOCK.surface}
        fillOpacity={0.8}
        stroke={accent}
      />
      <MeasurementStripLabels
        scene={scene}
        showSourceGuides={input.showSourceGuides}
        subjectIndex={subjectIndex}
        measureIndex={measureIndex}
      />
    </g>
  );
}
