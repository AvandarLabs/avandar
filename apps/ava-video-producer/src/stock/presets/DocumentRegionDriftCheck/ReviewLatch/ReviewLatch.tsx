import { mix, ramp } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LatchArm } from "./LatchArm";
import type { Input } from "../DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  matched: boolean;
};
/** Frames the review latch takes to close. */
const CLOSE_FRAMES = 38;
/**
 * A mismatching source closes the review latch instead of replacing content.
 */
export function ReviewLatch({
  input,
  frame,
  accent,
  matched,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const closure = ramp(
      frame,
      101,
      motion.scale(CLOSE_FRAMES),
      motion.entrance.easing,
    ),
    gap = matched ? mix(closure, 32, 18) : mix(closure, 32, 0);
  return (
    <g>
      {(["left", "right"] as const).map((side) => {
        return (
          <LatchArm
            key={side}
            side={side}
            reach={side === "left" ? -gap : gap}
            color={matched ? accent : tokens.color.highlight}
          />
        );
      })}
      <g opacity={closure}>
        <LabelSlots
          labels={[
            [
              matched ? input.labels.matched : input.labels.review,
              52,
              500,
              856,
              18,
              2,
            ],
          ]}
        />
      </g>
    </g>
  );
}
