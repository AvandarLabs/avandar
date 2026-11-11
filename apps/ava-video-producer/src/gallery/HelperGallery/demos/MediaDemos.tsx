import { useLingui } from "@lingui/react/macro";
import { enter, mix, ramp } from "../../../motion";
import { MediaPlane } from "../../../scenes/MediaPlane";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";

/** The curated fictional screenshot the media preview loads. */
const SCREEN = "avandar/screens/explorer-explorer-chart.png";

/** A still sampled through `MediaPlane`, fading in and drifting slightly. */
export function MediaPlaneDemo({ frame, frames }: HelperDemoProps) {
  const { t } = useLingui();
  const drift = ramp(frame, 10, 70);
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
        <div className={css.mediaFrame} style={enter(frame, 4)}>
          <MediaPlane
            frame={frame}
            kind="image"
            src={SCREEN}
            alt={t`Fictional Avandar chart screen`}
            // MediaPlane takes only a style, so its fill is set here.
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${mix(drift, 0, 100).toFixed(2)}% 0%`,
            }}
          />
          <span
            className={css.footnote}
          >{t`Fictional demonstration data`}</span>
        </div>
      </div>
    </HelperDemoFrame>
  );
}
