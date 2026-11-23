import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RehearsalRulerMaximum } from "./RehearsalRulerMaximum/RehearsalRulerMaximum";
import { RehearsalRulerMinimum } from "./RehearsalRulerMinimum/RehearsalRulerMinimum";
import { RehearsalRulerTitle } from "./RehearsalRulerTitle/RehearsalRulerTitle";
import { RehearsalRulerUnitLabel } from "./RehearsalRulerUnitLabel/RehearsalRulerUnitLabel";
import type { ReactNode } from "react";

type Props = {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  y: number;
};
/** Each numeric lane owns a fixed range, label, unit and current-value slot. */
export function RehearsalRuler({
  label,
  unit,
  min,
  max,
  value,
  y,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <RehearsalRulerTitle label={label} y={y} />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M380 ${y} H650 M380 ${y - 7} V${y + 7} M650 ${y - 7} V${y + 7}`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <RehearsalRulerMinimum {...{ min, y, tokens }} />
      <RehearsalRulerMaximum {...{ max, y, tokens }} />
      <RehearsalRulerUnitLabel {...{ unit, y, tokens }} />
      <FitText
        text={String(value)}
        x={716}
        y={y + 20}
        width={180}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
