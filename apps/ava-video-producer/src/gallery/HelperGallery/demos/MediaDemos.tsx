import { mix } from "../../../motion";
import { MediaPlane } from "../../../scenes/MediaPlane";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/** The curated fictional screenshot the media preview loads. */
const SCREEN = "avandar/screens/explorer-explorer-chart.png";
/** The slow drift across the still: its cue and length at tempo 1. */
const DRIFT = { at: 10, frames: 70 };

/** A still sampled through `MediaPlane`, fading in and drifting slightly. */
export function MediaPlaneDemo({ frame, frames }: HelperDemoProps): ReactNode {
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
      readouts={[
        { name: "kind", value: "image" },
        {
          name: "objectPosition",
          value: `${formatReadout(mix(drift, 0, 100), 0)}% 0%`,
        },
      ]}
    >
      <div className={css.centered}>
        <div className={css.mediaFrame} style={motion.enter(frame, 4)}>
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
              objectPosition: `${mix(drift, 0, 100).toFixed(2)}% 0%`,
            }}
          />
          <span className={css.footnote}>{"Fictional demonstration data"}</span>
        </div>
      </div>
    </HelperDemoFrame>
  );
}
