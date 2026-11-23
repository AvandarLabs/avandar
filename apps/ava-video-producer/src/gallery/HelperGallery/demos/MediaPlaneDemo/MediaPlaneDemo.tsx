import { Motion } from "../../../../motion";
import { MediaPlane } from "../../../../scenes/MediaPlane";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import css from "./MediaPlaneDemo.module.css";
import type { HelperDemoProps as Props } from "../helperDemo.types";
import type { ReactNode } from "react";
/** The curated fictional screenshot the media preview loads. */
const SCREEN = "avandar/screens/explorer-explorer-chart.png";
/** The slow drift across the still: its cue and length at tempo 1. */
const DRIFT = { at: 10, frames: 70 };
/** A still sampled through `MediaPlane`, fading in and drifting slightly. */
export function MediaPlaneDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  const drift = motion.ramp(
    frame,
    DRIFT.at,
    motion.scale(DRIFT.frames),
    motion.reveal.easing,
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`<MediaPlane frame={frame} kind="image" src="${SCREEN}" />`}
      readouts={_getMediaReadouts({ drift })}
    >
      <div className={css.mediaPlaneDemoCentered}>
        <div
          className={css.mediaPlaneDemoMediaFrame}
          style={motion.enter(frame, 4)}
        >
          <MediaPlane
            frame={frame}
            kind="image"
            src={SCREEN}
            alt="Fictional Avandar chart screen"
            // MediaPlane takes only a style, so its fill is set here.
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${Motion.mix({
                t: drift,
                from: 0,
                to: 100,
              }).toFixed(2)}% 0%`,
            }}
          />
          <span className={css.mediaPlaneDemoFootnote}>
            {"Fictional demonstration data"}
          </span>
        </div>
      </div>
    </HelperDemoFrame>
  );
}

function _getMediaReadouts({
  drift,
}: Readonly<{ drift: number }>): DemoReadout[] {
  return [
    { name: "kind", value: "image" },
    {
      name: "objectPosition",
      value: `${DemoTheme.formatReadout({
        value: Motion.mix({
          t: drift,
          from: 0,
          to: 100,
        }),
        digits: 0,
      })}% 0%`,
    },
  ];
}
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
