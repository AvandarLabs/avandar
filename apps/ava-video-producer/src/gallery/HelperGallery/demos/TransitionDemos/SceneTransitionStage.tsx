import clsx from "clsx";
import { getSceneTransitionStyle } from "../../../../motion-components/getSceneTransitionStyle";
import { MotionSettings } from "../../../../motion-components/MotionSettings/MotionSettings";
import css from "../demos.module.css";
import { TransitionDemosShared } from "./TransitionDemosShared/TransitionDemosShared";
import type { ReactNode } from "react";
/** One mini stage: shot A leaving and shot B entering by `kind`. */
export function SceneTransitionStage({
  kind,
  progress,
}: {
  kind: (typeof TransitionDemosShared.SCENE_KINDS)[number];
  progress: number;
}): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const props = { kind, ...TransitionDemosShared.STAGE };
  return (
    <div className={css.miniStage}>
      <div className={clsx(css.miniFrame, css.miniFrameScene)}>
        <div
          className={clsx(css.shot, css.shotA)}
          style={getSceneTransitionStyle({
            progress,
            entering: false,
            props,
            theme: settingsTheme,
          })}
        >
          A
        </div>
        <div
          className={clsx(css.shot, css.shotB)}
          style={getSceneTransitionStyle({
            progress,
            entering: true,
            props,
            theme: settingsTheme,
          })}
        >
          B
        </div>
      </div>
      <span className={css.caption}>{kind}</span>
    </div>
  );
}
