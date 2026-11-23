import { Motion } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { IntervalAxisLabels } from "./IntervalAxisLabels";
import { IntervalBandAndEndpoints } from "./IntervalBandAndEndpoints";
import { IntervalInterpretation } from "./IntervalInterpretation";
import { IntervalPatternDefinition } from "./IntervalPatternDefinition";
import { UncertaintyReference } from "./UncertaintyReference/UncertaintyReference";
import { UncertaintyValues } from "./UncertaintyValues";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./UncertaintyUnfold.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & {
  input: Input;
};

type GetAxisPositionOptions = {
  input: Readonly<Props>["input"];
  value: number;
};

type IntervalGeometry = {
  pointX: number;
  lowerX: number;
  upperX: number;
  unfold: number;
  referenceProgress: number;
  left: number;
  right: number;
  referenceX: number;
  patternId: string;
};

/** Samples the axis position for the current authored frame. */
function _getAxisPosition({
  input,
  value,
}: Readonly<GetAxisPositionOptions>): number {
  return (
    100 +
    760 *
      normalizeFiniteRange({
        value,
        min: input.axis.min,
        max: input.axis.max,
      })
  );
}

/** Samples the point, interval, and reference against the authored axis. */
function _getIntervalGeometry({
  frame,
  input,
  id,
  motion,
}: Readonly<
  Pick<Props, "frame" | "input" | "id"> & {
    motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  }
>): IntervalGeometry {
  const scale = (value: number) => {
    return _getAxisPosition({ input, value });
  };
  const pointX = scale(input.estimate.point),
    lowerX = scale(input.estimate.lower),
    upperX = scale(input.estimate.upper);
  const unfold = motion.ramp(frame, 38, motion.scale(48), motion.travel.easing),
    referenceProgress = motion.ramp(frame, 90, motion.scale(24));
  const left = Motion.mix({
      t: unfold,
      from: pointX,
      to: lowerX,
    }),
    right = Motion.mix({
      t: unfold,
      from: pointX,
      to: upperX,
    });
  const referenceX = input.reference ? scale(input.reference.value) : 0;
  const patternId = `interval-${encodeURIComponent(id)}`;
  return {
    pointX,
    lowerX,
    upperX,
    unfold,
    referenceProgress,
    left,
    right,
    referenceX,
    patternId,
  };
}

/** Supplied bounds unfold around a point on one fixed finite ruler. */
export function UncertaintyUnfold({
  frame,
  input,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const geometry = _getIntervalGeometry({ frame, input, id, motion });
  const drawing = { input, accent, tokens, frame, motion, ...geometry };
  return (
    <g opacity={motion.ramp(frame, 12, motion.scale(20))}>
      <IntervalPatternDefinition {...drawing} />
      <IntervalBandAndEndpoints {...drawing} />
      <circle
        data-estimate-point="true"
        cx={geometry.pointX}
        cy={300}
        r={7}
        fill={accent}
      />
      <UncertaintyReference
        input={input}
        referenceProgress={geometry.referenceProgress}
        referenceX={geometry.referenceX}
      />
      {input.showValues ? (
        <UncertaintyValues
          input={input}
          pointX={geometry.pointX}
          lowerX={geometry.lowerX}
          upperX={geometry.upperX}
          opacity={geometry.unfold}
        />
      ) : undefined}
      <IntervalAxisLabels {...drawing} />
      <IntervalInterpretation {...drawing} />
    </g>
  );
}
