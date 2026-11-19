import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
/** How opaque a measurement strip's surface is over the table behind it. */
const STRIP_FILL_OPACITY = 0.8;
/** Each measurement peels away carrying its subject, measure and unit. */
export function MeasurementStrip({
  input,
  frame,
  accent,
  subjectIndex,
  measureIndex,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scene = getMeasurementStripFromFrame({
    motion,
    input,
    frame,
    subjectIndex,
    measureIndex,
  });
  return (
    <g opacity={scene.opacity}>
      <StockRect
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
        fill={tokens.color.surface}
        fillOpacity={STRIP_FILL_OPACITY}
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
