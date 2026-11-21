import { clsx } from "clsx";
import { useVideoMotion } from "../../../../../../videoTheme/useVideoMotion";
import css from "./ClickFeedbackTarget.module.css";
import type { ReactNode } from "react";

const PRESS_CLICKS = [35, 62];
function _buildPressTransform({
  motion,
  frame,
}: Readonly<{
  motion: ReturnType<typeof useVideoMotion>;
  frame: number;
}>): string {
  return `scale(${Math.min(
    ...PRESS_CLICKS.map((at) => {
      return motion.press(frame, at);
    }),
  )})`;
}
type Props = {
  fill: string;
  motion: ReturnType<typeof useVideoMotion>;
  frame: number;
};
/** Draws the pressed query target for the click-feedback helper preview. */
export function ClickFeedbackTarget({
  fill,
  motion,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={clsx(
        css.clickFeedbackTargetClickFeedbackDemoButton,
        css.clickFeedbackTargetClickFeedbackDemoAbsolute,
        css.clickFeedbackTargetClickFeedbackDemoPressTarget,
      )}
      style={{
        background: fill,
        transform: _buildPressTransform({ motion, frame }),
      }}
    >
      Run query
    </div>
  );
}
