import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LandSteward } from "../LandSteward";
import { TreatmentDetail } from "./TreatmentDetail";
import type { Input } from "../ContourSedimentRetention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** A steward carries the selected barrier into contact with the slope. */
export function ContourTreatment({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const place = motion.ramp(frame, 36, motion.scale(24), motion.travel.easing);
  const x = mix(place, 300, 510);
  const y = mix(place, 155, 275);
  return (
    <g>
      <StockRect
        data-treatment="physical"
        x={x}
        y={y}
        width={24}
        height={65}
        fill={
          input.intervention.kind === "stone-bund"
            ? tokens.color.inactive
            : accent
        }
        fillOpacity={scales.wash(atomic.opacity["35"])}
        stroke={accent}
      />
      <TreatmentDetail
        isVegetated={input.intervention.kind === "vegetated-strip"}
        x={x}
        y={y}
        accent={accent}
      />
      <LandSteward x={x} y={y} accent={accent} />
    </g>
  );
}
