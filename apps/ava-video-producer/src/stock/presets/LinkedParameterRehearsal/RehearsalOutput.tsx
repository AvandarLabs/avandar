import { ramp } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { evaluateAffineRule } from "./evaluateAffineRule";
import { RehearsalRuler } from "./RehearsalRuler";
import type { Input } from "./LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type Props = {
  output: Input["outputs"][number];
  source: Input["source"];
  value: number;
  index: number;
  frame: number;
  accent: string;
  sourceX: number;
  showRules: boolean;
  showBaselineMarkers: boolean;
};

/** Frames between neighbouring output lanes appearing. */
const LANE_STAGGER_FRAMES = 3;
/** Frames an output lane takes to fade in. */
const LANE_FRAMES = 16;
/**
 * A pointer follows its direct affine rule with a coupling only when
 * dependent.
 */
export function RehearsalOutput({
  output,
  source,
  value,
  index,
  frame,
  accent,
  sourceX,
  showRules,
  showBaselineMarkers,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const computed = evaluateAffineRule({
    source: value,
    multiplier: output.multiplier,
    offset: output.offset,
  });
  const baseline = evaluateAffineRule({
    source: source.baseline,
    multiplier: output.multiplier,
    offset: output.offset,
  });
  const pointerX =
    380 +
    270 *
      normalizeFiniteRange({
        value: computed,
        min: output.min,
        max: output.max,
      });
  const baselineX =
    380 +
    270 *
      normalizeFiniteRange({
        value: baseline,
        min: output.min,
        max: output.max,
      });
  const y = 252 + index * 90;
  const color = output.multiplier === 0 ? tokens.color.inactive : accent;
  return (
    <g
      opacity={ramp(
        frame,
        16 + index * motion.scaleStagger(LANE_STAGGER_FRAMES),
        motion.scale(LANE_FRAMES),
        motion.reveal.easing,
      )}
    >
      {output.multiplier !== 0 ? (
        <g data-coupling-id={output.id}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${sourceX} 170 V${192 + index * 5} H${348 + index * 6} V${y} H${pointerX}`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeOpacity={atomic.opacity["24"]}
          />
        </g>
      ) : undefined}
      <RehearsalRuler
        label={output.label}
        unit={output.unit}
        min={output.min}
        max={output.max}
        value={computed}
        y={y}
      />
      {showBaselineMarkers ? (
        <g data-baseline-id={output.id}>
          <SketchedShape
            shape={{ kind: "circle", cx: baselineX, cy: y, r: 9 }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={color}
            strokeOpacity={tokens.alpha.guide}
          />
        </g>
      ) : undefined}
      <circle
        data-output-id={output.id}
        data-value={computed}
        cx={pointerX}
        cy={y}
        r={5}
        fill={color}
      />
      {showRules ? (
        <FitText
          text={`${output.multiplier} × ${source.label} + (${output.offset})`}
          x={32}
          y={y + 56}
          width={896}
          fontSize={12}
          maxLines={1}
          breakLongWords
          normalizeWhitespace
          color={tokens.color.textMuted}
        />
      ) : undefined}
    </g>
  );
}
