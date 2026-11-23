import { TextReveal } from "../../../../../scenes/TextReveal/TextReveal";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./WipeExitDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const EXIT_AT = 45;

const EXIT_FRAMES = 12;

/** A wordmark wiped in, then retracted by `getWipeExitStyle()`. */
export function WipeExitDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const exit = TextReveal.getWipeExitStyle({
    frame,
    at: EXIT_AT,
    durationInFrames: motion.scale(EXIT_FRAMES),
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getWipeExitStyle({ frame, at: ${EXIT_AT}, durationInFrames: ${EXIT_FRAMES} })`}
      readouts={[{ name: "clipPath", value: String(exit.clipPath) }]}
    >
      <div className={css.wipeExitDemoCentered}>
        <div style={exit}>
          <p
            className={css.wipeExitDemoHeadline}
            style={TextReveal.getLineRevealStyle({
              frame,
              at: 8,
              mode: "wipe",
              options: {},
              motion,
            })}
          >
            Motion Atlas
          </p>
        </div>
      </div>
    </HelperDemoFrame>
  );
}
