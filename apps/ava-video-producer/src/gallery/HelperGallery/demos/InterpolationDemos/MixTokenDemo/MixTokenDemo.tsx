import { Motion } from "../../../../../motion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { useVideoTokens } from "../../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { MixTokenSwatches } from "../MixTokenSwatches/MixTokenSwatches";
import css from "./MixTokenDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** Cues of the mix token preview: the chip turns on, then off again. */
const MIX_CUES = { on: 15, off: 50 };

/** Renders MixTokenDemo with the authored gallery behavior. */
export function MixTokenDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const scene = useVideoTokens().color.scene;
  const easing = motion.reveal.easing;
  const t =
    motion.ramp(frame, MIX_CUES.on, motion.chip, easing) *
    (1 - motion.ramp(frame, MIX_CUES.off, motion.chip, easing));
  const color = Motion.mixToken({
    t,
    from: scene.border,
    to: scene.brand,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="mixToken(t, scene.border, scene.brand)"
      readouts={[
        { name: "t", value: DemoTheme.formatReadout({ value: t }) },
        { name: "css", value: color },
      ]}
    >
      <div className={css.mixTokenDemoCentered}>
        <div className={css.mixTokenDemoCardColumn}>
          <div
            className={css.mixTokenDemoChip}
            style={{ borderColor: color, color }}
          >
            Selected
          </div>
          <MixTokenSwatches t={t} />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
