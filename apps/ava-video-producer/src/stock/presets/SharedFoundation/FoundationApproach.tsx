import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { ApproachTrait } from "./ApproachTrait";
import type { Input } from "./SharedFoundation.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  approach: Input["approaches"][number];
  index: number;
  showTrait: boolean;
};
/**
 * Each distinct identity lifts independently while keeping its authored trait.
 */
export function FoundationApproach({
  frame,
  accent,
  approach,
  index,
  showTrait,
}: Readonly<Props>): ReactNode {
  const x = 80 + index * 440;
  const lift = ramp(frame, 36, 36, EASE.inOut);
  const arrival = ramp(frame, 12 + index * 6, 18);
  return (
    <g
      data-approach={approach.id}
      opacity={arrival}
      transform={`translate(0 ${mix(lift, 0, -40) + mix(arrival, 12, 0)})`}
    >
      <path
        d={`M${x} 370 V180 H${x + 360} V370 Z`}
        stroke={index ? STOCK.mint : accent}
        fill={STOCK.surface}
        strokeWidth={2}
      />
      <FitText
        text={approach.label}
        x={x + 180}
        y={220}
        width={320}
        fontSize={20}
        maxLines={3}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <ApproachTrait {...{ frame, approach, index, x, showTrait }} />
    </g>
  );
}
