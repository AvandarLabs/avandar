import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DocumentReviewStatus } from "./DocumentReviewStatus/DocumentReviewStatus";
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
  const closure = Motion.ramp({
      frame,
      at: 101,
      dur: motion.scale(CLOSE_FRAMES),
      easing: motion.entrance.easing,
    }),
    gap = matched
      ? Motion.mix({ t: closure, from: 32, to: 18 })
      : Motion.mix({ t: closure, from: 32, to: 0 });
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
      <DocumentReviewStatus {...{ input, matched, closure }} />
    </g>
  );
}
