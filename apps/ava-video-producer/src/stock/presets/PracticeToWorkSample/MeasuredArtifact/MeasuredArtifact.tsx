import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AlignmentGuides } from "../AlignmentGuides";
import { MeasurementMark } from "../MeasurementMark/MeasurementMark";
import { MaterialTexture } from "./MaterialTexture";
import type { Input } from "../PracticeToWorkSample.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
      <MaterialTexture material={material} />
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
