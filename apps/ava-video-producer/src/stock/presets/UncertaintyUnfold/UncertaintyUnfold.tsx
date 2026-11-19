import { mix } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { UncertaintyAxis } from "./UncertaintyAxis";
import { UncertaintyReference } from "./UncertaintyReference";
import { UncertaintyValues } from "./UncertaintyValues";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./UncertaintyUnfold.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

/** Supplied bounds unfold around a point on one fixed finite ruler. */
export function UncertaintyUnfold({
  frame,
  input,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scale = (value: number) => {
    return (
      100 +
      760 *
        normalizeFiniteRange({
          value,
          min: input.axis.min,
          max: input.axis.max,
        })
    );
  };
  const pointX = scale(input.estimate.point),
    lowerX = scale(input.estimate.lower),
    upperX = scale(input.estimate.upper);
  const unfold = motion.ramp(frame, 38, motion.scale(48), motion.travel.easing),
    referenceProgress = motion.ramp(frame, 90, motion.scale(24));
  const left = mix(unfold, pointX, lowerX),
    right = mix(unfold, pointX, upperX);
  const referenceX = input.reference ? scale(input.reference.value) : 0;
  const patternId = `interval-${encodeURIComponent(id)}`;
  return (
    <g opacity={motion.ramp(frame, 12, motion.scale(20))}>
      <defs>
        <pattern
          id={patternId}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
        >
          <SketchedShape
            shape={{ kind: "path", d: "M-2 2 L2 -2 M0 10 L10 0 M8 12 L12 8" }}
            profile={tokens.sketch.shape}
            stroke={accent}
            strokeOpacity={tokens.alpha.guide}
          />
        </pattern>
      </defs>
      <UncertaintyAxis input={input} />
      <StockRect
        data-interval-band="true"
        x={left}
        y={278}
        width={right - left}
        height={44}
        fill={`url(#${patternId})`}
        stroke={accent}
        strokeOpacity={unfold}
      />
      <SketchedShape
        shape={{ kind: "line", x1: left, y1: 270, x2: left, y2: 330 }}
        profile={tokens.sketch.shape}
        data-lower-endpoint="true"
        stroke={accent}
        opacity={unfold}
      />
      <SketchedShape
        shape={{ kind: "line", x1: right, y1: 270, x2: right, y2: 330 }}
        profile={tokens.sketch.shape}
        data-upper-endpoint="true"
        stroke={accent}
        opacity={unfold}
      />
      <circle
        data-estimate-point="true"
        cx={pointX}
        cy={300}
        r={7}
        fill={accent}
      />
      <UncertaintyReference
        input={input}
        referenceProgress={referenceProgress}
        referenceX={referenceX}
      />
      {input.showValues ? (
        <UncertaintyValues
          input={input}
          pointX={pointX}
          lowerX={lowerX}
          upperX={upperX}
          opacity={unfold}
        />
      ) : undefined}
      <g opacity={unfold}>
        <FitText
          text={input.axis.unit}
          x={480}
          y={430}
          width={760}
          fontSize={14}
          maxLines={1}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
          color={tokens.color.textMuted}
        />
        <FitText
          text={input.interval.label}
          x={100}
          y={466}
          width={760}
          fontSize={18}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
          color={accent}
        />
      </g>
      <g opacity={motion.reveal(frame, 108)}>
        <FitText
          text={input.interpretation}
          x={100}
          y={540}
          width={760}
          fontSize={14}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </g>
  );
}
