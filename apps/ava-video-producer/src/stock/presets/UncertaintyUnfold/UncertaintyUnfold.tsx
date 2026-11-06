import { EASE, mix, ramp } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { UncertaintyAxis } from "./UncertaintyAxis";
import { UncertaintyReference } from "./UncertaintyReference";
import { UncertaintyValues } from "./UncertaintyValues";
import type { GraphicProps } from "../../graphics-common";
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
  const scale = (value: number) =>
    100 +
    760 *
      normalizeFiniteRange({ value, min: input.axis.min, max: input.axis.max });
  const pointX = scale(input.estimate.point),
    lowerX = scale(input.estimate.lower),
    upperX = scale(input.estimate.upper);
  const unfold = ramp(frame, 38, 48, EASE.inOut),
    referenceProgress = ramp(frame, 90, 24);
  const left = mix(unfold, pointX, lowerX),
    right = mix(unfold, pointX, upperX);
  const referenceX = input.reference ? scale(input.reference.value) : 0;
  const patternId = `interval-${encodeURIComponent(id)}`;
  return (
    <g opacity={ramp(frame, 12, 20)}>
      <defs>
        <pattern
          id={patternId}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M-2 2 L2 -2 M0 10 L10 0 M8 12 L12 8"
            stroke={accent}
            strokeOpacity={0.5}
          />
        </pattern>
      </defs>
      <UncertaintyAxis input={input} />
      <rect
        data-interval-band="true"
        x={left}
        y={278}
        width={right - left}
        height={44}
        fill={`url(#${patternId})`}
        stroke={accent}
        strokeOpacity={unfold}
      />
      <line
        data-lower-endpoint="true"
        x1={left}
        x2={left}
        y1={270}
        y2={330}
        stroke={accent}
        opacity={unfold}
      />
      <line
        data-upper-endpoint="true"
        x1={right}
        x2={right}
        y1={270}
        y2={330}
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
          color={STOCK.muted}
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
      <g opacity={ramp(frame, 108, 12)}>
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
