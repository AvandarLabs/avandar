import { Motion } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { evaluateAffineRule } from "./evaluateAffineRule";
import { RehearsalOutputCoupling } from "./RehearsalOutputCoupling/RehearsalOutputCoupling";
import { RehearsalOutputScale } from "./RehearsalOutputScale/RehearsalOutputScale";
import { RehearsalRuleLabel } from "./RehearsalRuleLabel/RehearsalRuleLabel";
import type { Input } from "./LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type RehearsalPointerState = {
  computed: number;
  pointerX: number;
  baselineX: number;
  y: number;
  color: string;
};

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

type GetRehearsalPointerStateOptions = {
  output: Input["outputs"][number];
  source: Input["source"];
  value: number;
  index: number;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};
/** Samples the authored rehearsal pointer state. */
function _getRehearsalPointerState({
  output,
  source,
  value,
  index,
  accent,
  tokens,
}: Readonly<GetRehearsalPointerStateOptions>): RehearsalPointerState {
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
  return { computed, pointerX, baselineX, y, color };
}

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
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { computed, pointerX, baselineX, y, color } = _getRehearsalPointerState(
    { output, source, value, index, accent, tokens },
  );
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 16 + index * motion.scaleStagger(LANE_STAGGER_FRAMES),
        dur: motion.scale(LANE_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <RehearsalOutputCoupling
        {...{ output, sourceX, index, y, pointerX, tokens, accent }}
        atomic={atomic}
      />
      <RehearsalOutputScale
        {...{ output, showBaselineMarkers, tokens, computed }}
        {...{ pointerX, baselineX, y, color }}
      />
      <RehearsalRuleLabel {...{ output, source, showRules, tokens, y }} />
    </g>
  );
}

/** Result of the authored RehearsalOutput calculation. */
export type RehearsalOutputGetRehearsalPointerStateValue = ReturnType<
  typeof _getRehearsalPointerState
>;
