import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicTheme,
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
/** Each measurement peels away carrying its subject, measure and unit. */
export function MeasurementStrip({
  input,
  frame,
  accent,
  subjectIndex,
  measureIndex,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const scene = getMeasurementStripFromFrame({
    motion,
    input,
    frame,
    subjectIndex,
    measureIndex,
  });
  return (
    <g opacity={scene.opacity}>
      <StripCard
        scene={scene}
        cellKey={`${subjectIndex}:${measureIndex}`}
        accent={accent}
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

/** The strip's card, keyed to its source cell and resulting observation. */
function StripCard({
  scene,
  cellKey,
  accent,
}: Readonly<{
  scene: ReturnType<typeof getMeasurementStripFromFrame>;
  cellKey: string;
  accent: string;
}>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  return (
    <StockRect
      data-transfer-measurement={cellKey}
      data-observation={
        !scene.isOmitted ? `${scene.subject.id}:${scene.measure.id}` : undefined
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
      fillOpacity={atomic.opacity["80"]}
      stroke={accent}
    />
  );
}
