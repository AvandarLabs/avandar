import { Motion } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getRehearsalStateFromInputAndFrame } from "./getRehearsalStateFromInputAndFrame";
import { RehearsalContext } from "./RehearsalContext";
import { RehearsalOutputs } from "./RehearsalOutputs";
import { SourceRulerAndBaseline } from "./SourceRulerAndBaseline";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & {
  input: Input;
};

type ValueOptions = {
  frame: Readonly<Props>["frame"];
  input: Readonly<Props>["input"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type ValueResult = {
  value: ReturnType<typeof getRehearsalStateFromInputAndFrame>["value"];
  label: ReturnType<typeof getRehearsalStateFromInputAndFrame>["label"];
  sourceX: number;
  baselineX: number;
};

/** Frames the source lane takes to fade in. */
const INTRO_FRAMES = 20;

/**
 * Samples the linked parameter rehearsal value state for the current authored
 * frame.
 */
function _getLinkedParameterRehearsalValueState({
  frame,
  input,
  motion,
}: Readonly<ValueOptions>): ValueResult {
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
  return { value, label, sourceX, baselineX };
}

/**
 * Direct dependent pointers rehearse a source change and restore its baseline.
 */
export function LinkedParameterRehearsal({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { value, label, sourceX, baselineX } =
    _getLinkedParameterRehearsalValueState({ frame, input, motion });
  const drawing = {
    input,
    accent,
    tokens,
    label,
    value,
    baselineX,
    frame,
    sourceX,
  };
  return (
    <g>
      <g
        opacity={Motion.ramp({
          frame,
          at: 12,
          dur: motion.scale(INTRO_FRAMES),
          easing: motion.reveal.easing,
        })}
      >
        <RehearsalContext {...drawing} />
        <SourceRulerAndBaseline {...drawing} />
        <circle
          data-source-pointer="true"
          data-value={value}
          cx={sourceX}
          cy={170}
          r={6}
          fill={accent}
        />
      </g>
      <RehearsalOutputs {...drawing} />
    </g>
  );
}
