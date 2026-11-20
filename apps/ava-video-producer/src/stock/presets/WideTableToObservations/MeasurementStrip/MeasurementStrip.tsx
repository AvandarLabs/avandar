import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getMeasurementStripFromFrame } from "../getMeasurementStripFromFrame";
import { MeasurementStripLabels } from "../MeasurementStripLabels";
import { StripCard } from "./StripCard";
import type { Input } from "../WideTableToObservations.schema";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
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
