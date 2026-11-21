import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ApproachFrameAndLabel } from "./ApproachFrameAndLabel";
import type { Input } from "../SharedFoundation.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  approach: Input["approaches"][number];
  index: number;
  showTrait: boolean;
};

type GetApproachVerticalOffsetOptions = { lift: number; arrival: number };

/** Samples the approach vertical offset for the current authored frame. */
function _getApproachVerticalOffset({
  lift,
  arrival,
}: Readonly<GetApproachVerticalOffsetOptions>): number {
  return (
    Motion.mix({
      t: lift,
      from: 0,
      to: -40,
    }) +
    Motion.mix({
      t: arrival,
      from: 12,
      to: 0,
    })
  );
}

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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const x = 80 + index * 440;
  const lift = motion.ramp(frame, 36, motion.scale(36), motion.travel.easing);
  const arrival = motion.ramp(
    frame,
    12 + index * motion.scaleStagger(6),
    motion.hero,
  );
  return (
    <g
      data-approach={approach.id}
      opacity={arrival}
      transform={`translate(0 ${_getApproachVerticalOffset({
        lift,
        arrival,
      })})`}
    >
      <ApproachFrameAndLabel
        frame={frame}
        accent={accent}
        approach={approach}
        index={index}
        showTrait={showTrait}
        tokens={tokens}
        scales={scales}
        x={x}
      />
    </g>
  );
}
