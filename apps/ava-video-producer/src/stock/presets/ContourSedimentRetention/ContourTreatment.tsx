import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { LandSteward } from "./LandSteward";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** A steward carries the selected barrier into contact with the slope. */
export function ContourTreatment({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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
      {input.intervention.kind === "vegetated-strip" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x + 12} ${y + 55}V${y - 14}M${x + 12} ${y + 10}l-16 -20M${x + 12} ${y + 28}l20 -20`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      ) : (
        <SketchedShape
          shape={{ kind: "path", d: `M${x} ${y + 20}h24M${x} ${y + 43}h24` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.text}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      )}
      <LandSteward x={x} y={y} accent={accent} />
    </g>
  );
}
