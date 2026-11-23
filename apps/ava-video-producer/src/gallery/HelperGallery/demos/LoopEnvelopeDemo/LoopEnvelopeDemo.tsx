import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { LoopSeries } from "../LoopSeries/LoopSeries";
import { DemoCard } from "../parts/DemoCard/DemoCard";
import css from "./LoopEnvelopeDemo.module.css";
import type { HelperDemoProps } from "../helperDemo.types";
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

/** Renders LoopEnvelopeDemo for live helper catalog previews. */
export function LoopEnvelopeDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  const envelope = motion.loopEnvelope(frame, frames);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`loopEnvelope(frame, ${frames})  fadeFrames ${motion.loopFade.graphic}`}
      readouts={_getLoopEnvelopeReadouts({ envelope, motion, frames })}
    >
      <div className={css.loopEnvelopeDemoCards}>
        <div
          className={css.loopEnvelopeDemoCentered}
          style={{ opacity: envelope }}
        >
          <DemoCard title="loopEnvelope" />
        </div>
        <div className={css.loopEnvelopeDemoCentered}>
          <LoopSeries
            frame={frame}
            frames={frames}
            sample={(value) => {
              return motion.loopEnvelope(value, frames);
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}

/** Formats the live readouts displayed by LoopEnvelopeDemo. */
function _getLoopEnvelopeReadouts({
  envelope,
  motion,
  frames,
}: Readonly<{
  envelope: number;
  motion: ReturnType<typeof useVideoMotion>;
  frames: number;
}>): DemoReadout[] {
  return [
    {
      name: "envelope",
      value: DemoTheme.formatReadout({ value: envelope }),
    },
    {
      name: "first",
      value: DemoTheme.formatReadout({
        value: motion.loopEnvelope(0, frames),
      }),
    },
    {
      name: "last",
      value: DemoTheme.formatReadout({
        value: motion.loopEnvelope(frames - 1, frames),
      }),
    },
  ];
}

type Props = HelperDemoProps;
