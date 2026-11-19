import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { TrackLabels } from "./TrackLabels";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * A single released ball stops at the supplied observation after all flags
 * land.
 */
export function ExperimentTrack({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const descent = motion.ramp(
    frame,
    76,
    motion.scale(10),
    motion.travel.easing,
  );
  const roll = motion.ramp(frame, 86, motion.scale(22), motion.travel.easing);
  const observedX =
    450 + (430 * input.observationDistance) / input.track.maximum;
  const ballX = frame < 86 ? mix(descent, 405, 450) : mix(roll, 450, observedX);
  return (
    <g>
      <StockRect
        x={390}
        y={130}
        width={540}
        height={390}
        rx={scales.corner(15)}
        fill={tokens.color.surface}
        fillOpacity={scales.wash(atomic.opacity["30"])}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M400 480 L450 500 H880 M450 495 V507 M880 495 V507",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <circle
        data-ball-distance={roll * input.observationDistance}
        cx={ballX}
        cy={mix(descent, 470, 490)}
        r={7}
        fill={tokens.color.highlight}
      />
      {frame >= 108 ? (
        <g data-observation-distance={input.observationDistance}>
          <SketchedShape
            shape={{ kind: "path", d: `M${observedX} 472 l6 6 l-6 6 l-6 -6 Z` }}
            profile={tokens.sketch.shape}
            fill={accent}
            stroke={accent}
          />
        </g>
      ) : undefined}
      <TrackLabels input={input} />{" "}
    </g>
  );
}
