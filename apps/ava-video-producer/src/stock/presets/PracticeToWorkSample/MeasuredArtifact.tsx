import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { AlignmentGuides } from "./AlignmentGuides";
import { MeasurementMark } from "./MeasurementMark";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";

/** A fabric workpiece's corner, before the theme's corner style. */
const FABRIC_CORNER = 14;
/** A sheet workpiece's corner, before the theme's corner style. */
const SHEET_CORNER = 2;
type Props = {
  input: Input;
  x: number;
  y: number;
  progress: number;
  isPractice: boolean;
  accent: string;
};
/** Both material samples carry the exact same authored measurement and unit. */
export function MeasuredArtifact({
  input,
  x,
  y,
  progress,
  isPractice,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const material = isPractice ? "sheet" : input.workpieces.material;
  return (
    <g data-artifact={material} transform={`translate(${x} ${y})`}>
      <StockRect
        width={220}
        height={116}
        rx={scales.corner(material === "fabric" ? FABRIC_CORNER : SHEET_CORNER)}
        fill={tokens.color.surface}
        stroke={isPractice ? tokens.color.text : tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {material === "wood" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: "M8 20 Q80 6 212 20 M8 93 Q150 108 212 94",
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.highlight}
          strokeOpacity={atomic.opacity["30"]}
        />
      ) : undefined}
      {material === "fabric" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M7 7 H213 V109 H7 Z" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.positive}
          strokeDasharray={tokens.dash.guide.join(" ")}
        />
      ) : undefined}
      <MeasurementMark
        input={input}
        progress={progress}
        isPractice={isPractice}
        accent={accent}
      />
      <AlignmentGuides input={input} />
    </g>
  );
}
