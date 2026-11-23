import { Motion } from "../../../../../motion";
import { getHorizontalBlurFilter } from "../../../../../motion-components/getHorizontalBlurFilter/getHorizontalBlurFilter";
import { HorizontalBlurFilter } from "../../../../../motion-components/HorizontalBlurFilter";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCard } from "../../parts/DemoCard/DemoCard";
import css from "./HorizontalBlurDemo.module.css";
import type { VideoMotion } from "../../../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

/** How far the sliding cards travel, in pixels. */
const TRAVEL = 600;

/** Cues of the slide: out, then back. */
const SLIDE_CUES = { out: 10, back: 36 };

/** The blur radius cap, and the blur per pixel travelled in one frame. */
const BLUR = { limit: 40, perPixel: 0.6 };

/** A card sliding right, holding, then sliding back, on the travel curve. */
function _getSlideX({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
}>): number {
  const easing = motion.travel.easing;
  const out = motion.ramp(frame, SLIDE_CUES.out, motion.sheet, easing);
  const back = motion.ramp(frame, SLIDE_CUES.back, motion.sheet, easing);
  return Motion.mix({
    t: out - back,
    from: 0,
    to: TRAVEL,
  });
}

/** Formats the blur amount and CSS filter shown beside the comparison. */
function _getHorizontalBlurReadouts(amount: number): DemoReadout[] {
  return [
    {
      name: "amount",
      value: `${DemoTheme.formatReadout({ value: amount, digits: 1 })}px`,
    },
    {
      name: "filter",
      value:
        getHorizontalBlurFilter({
          id: "slide",
          amount,
        }) ?? "none",
    },
  ];
}

/** The same slide with the X-only blur filter and with no blur. */
export function HorizontalBlurDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const x = _getSlideX({ frame, motion });
  const previousX = _getSlideX({ frame: frame - 1, motion });
  const amount = Math.min(BLUR.limit, Math.abs(x - previousX) * BLUR.perPixel);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='<HorizontalBlurFilter id="slide" amount={amount} />'
      readouts={_getHorizontalBlurReadouts(amount)}
    >
      <HorizontalBlurFilter id="slide" amount={amount} />
      <div className={css.horizontalBlurDemoRails}>
        <div className={css.horizontalBlurDemoCardColumn}>
          <span className={css.horizontalBlurDemoCaption}>{"X-only blur"}</span>
          <DemoCard
            title="Moving window"
            style={{
              transform: `translateX(${(x - TRAVEL / 2).toFixed(2)}px)`,
              filter: getHorizontalBlurFilter({
                id: "slide",
                amount,
              }),
            }}
          />
        </div>
        <div className={css.horizontalBlurDemoCardColumn}>
          <span className={css.horizontalBlurDemoCaption}>{"No blur"}</span>
          <DemoCard
            title="Moving window"
            style={{
              transform: `translateX(${(x - TRAVEL / 2).toFixed(2)}px)`,
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
