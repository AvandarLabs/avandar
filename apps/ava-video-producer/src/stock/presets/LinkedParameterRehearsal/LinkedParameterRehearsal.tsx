import { ramp } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getRehearsalStateFromInputAndFrame } from "./getRehearsalStateFromInputAndFrame";
import { RehearsalOutput } from "./RehearsalOutput";
import { RehearsalRuler } from "./RehearsalRuler";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

/** Frames the source lane takes to fade in. */
const INTRO_FRAMES = 20;
/**
 * Direct dependent pointers rehearse a source change and restore its
 * baseline.
 */
export function LinkedParameterRehearsal({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const { value, label } = getRehearsalStateFromInputAndFrame({
    frame,
    input,
    motion,
  });
  const sourceX =
    380 +
    270 *
      normalizeFiniteRange({
        value,
        min: input.source.min,
        max: input.source.max,
      });
  const baselineX =
    380 +
    270 *
      normalizeFiniteRange({
        value: input.source.baseline,
        min: input.source.min,
        max: input.source.max,
      });
  return (
    <g>
      <g
        opacity={ramp(
          frame,
          12,
          motion.scale(INTRO_FRAMES),
          motion.reveal.easing,
        )}
      >
        <FitText
          text={input.contextLabel}
          x={64}
          y={48}
          width={832}
          fontSize={14}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
          color={tokens.color.textMuted}
        />
        <FitText
          text={label}
          x={64}
          y={102}
          width={832}
          fontSize={18}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
          color={accent}
        />
        <RehearsalRuler
          label={input.source.label}
          unit={input.source.unit}
          min={input.source.min}
          max={input.source.max}
          value={value}
          y={170}
        />
        {input.showBaselineMarkers ? (
          <SketchedShape
            shape={{ kind: "circle", cx: baselineX, cy: 170, r: 10 }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeOpacity={tokens.alpha.guide}
          />
        ) : undefined}
        <circle
          data-source-pointer="true"
          data-value={value}
          cx={sourceX}
          cy={170}
          r={6}
          fill={accent}
        />
      </g>
      {input.outputs.map((output, index) => {
        return (
          <RehearsalOutput
            key={output.id}
            output={output}
            source={input.source}
            value={value}
            index={index}
            frame={frame}
            accent={accent}
            sourceX={sourceX}
            showRules={input.showRules}
            showBaselineMarkers={input.showBaselineMarkers}
          />
        );
      })}
    </g>
  );
}
