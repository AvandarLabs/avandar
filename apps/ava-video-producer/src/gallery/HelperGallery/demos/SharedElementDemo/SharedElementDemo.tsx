import { MotionSettings } from "../../../../motion-components/MotionSettings/MotionSettings";
import { SharedElement } from "../../../../motion-components/SharedElement";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { RectOutline } from "../RectOutline/RectOutline";
import css from "./SharedElementDemo.module.css";
import type { MotionRect } from "../../../../motion-components/getOverlayTimings";
import type { HelperDemoProps } from "../helperDemo.types";
import type { ReactNode } from "react";

const SOURCE: MotionRect = { x: 40, y: 300, width: 200, height: 52 };

const TARGET: MotionRect = { x: 420, y: 40, width: 440, height: 140 };

const SHARE_AT = 20;

const SHARE_FRAMES = 30;

/** Renders SharedElementDemo for live helper catalog previews. */
export function SharedElementDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const progress = MotionSettings.getMotionProgress({
    frame,
    at: SHARE_AT,
    duration: SHARE_FRAMES,
    options: undefined,
    fallback: undefined,
    theme: settingsTheme,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`<SharedElement source target frame at={${SHARE_AT}} durationInFrames={${SHARE_FRAMES}}>`}
      readouts={[
        {
          name: "progress",
          value: DemoTheme.formatReadout({ value: progress }),
        },
      ]}
    >
      <RectOutline rect={SOURCE} label="source" />
      <RectOutline rect={TARGET} label="target" />
      <SharedElement
        source={SOURCE}
        target={TARGET}
        frame={frame}
        at={SHARE_AT}
        durationInFrames={SHARE_FRAMES}
        className={css.sharedElementDemoSharedToken}
      >
        {"Response cases"}
      </SharedElement>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
