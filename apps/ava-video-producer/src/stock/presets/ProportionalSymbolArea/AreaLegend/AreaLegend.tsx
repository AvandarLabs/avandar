import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { AreaReferenceComparison } from "./AreaReferenceComparison";
import { useAreaLegendPresentation } from "./useAreaLegendPresentation";
import type { Input } from "../ProportionalSymbolArea.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Reference area and optional radius ratios use the same square-root scale. */
export function AreaLegend(props: Readonly<Props>): ReactNode {
  const presentation = useAreaLegendPresentation(props);

  return (
    <g data-area-legend="true" data-area-per-unit={props.input.areaPerUnit}>
      <SketchedShape
        shape={{ kind: "circle", cx: 546, cy: 466, r: presentation.radius }}
        profile={presentation.sketch.shape}
        fill="none"
        stroke={props.accent}
        strokeWidth={presentation.hairline}
      />
      <LabelSlots
        labels={[
          [
            `1 ${props.input.unitLabel} = ${props.input.areaPerUnit} px²`,
            586,
            454,
            326,
            12,
            3,
          ],
        ]}
      />
      {props.input.showRadiusComparison ? (
        <AreaReferenceComparison {...presentation} />
      ) : undefined}
    </g>
  );
}
