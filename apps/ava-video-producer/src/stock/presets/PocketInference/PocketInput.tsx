import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input };
/** The supplied input fold enters a writing area entirely inside the device. */
export function PocketInput({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const progress = motion.ramp(frame, 38, motion.scale(16));
  const y = mix(progress, 218, 228);
  const labels = [
    {
      text: input.input.label,
      y: y + 16,
      maxLines: 1,
      color: tokens.color.textMuted,
    },
    {
      text: input.input.text,
      y: y + 38,
      maxLines: 4,
      color: tokens.color.text,
    },
  ];
  return (
    <g>
      <StockRect
        data-internal-input="local"
        x={202}
        y={y}
        width={556}
        height={94}
        rx={scales.corner(3)}
        fill={tokens.color.ground}
        stroke={tokens.color.line}
      />
      <g opacity={progress}>
        {input.showLabels ? (
          labels.map((label) => {
            return (
              <FitText
                key={label.y}
                {...label}
                x={214}
                width={532}
                fontSize={12}
                normalizeWhitespace
                breakLongWords
              />
            );
          })
        ) : (
          <SketchedShape
            shape={{
              kind: "path",
              d: `M214 ${y + 20} h490 M214 ${y + 38} h418`,
            }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.inactive}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          />
        )}
      </g>
    </g>
  );
}
