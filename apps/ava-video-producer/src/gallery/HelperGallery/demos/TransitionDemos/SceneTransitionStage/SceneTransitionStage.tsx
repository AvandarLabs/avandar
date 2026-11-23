import { clsx } from "clsx";
import { getSceneTransitionStyle } from "../../../../../motion-components/getSceneTransitionStyle";
import { MotionSettings } from "../../../../../motion-components/MotionSettings/MotionSettings";
import { TransitionDemosShared } from "../TransitionDemosShared/TransitionDemosShared";
import { SceneTransitionShot } from "./SceneTransitionShot/SceneTransitionShot";
import css from "./SceneTransitionStage.module.css";
import type { ReactNode } from "react";

type Props = {
  kind: (typeof TransitionDemosShared.SCENE_KINDS)[number];
  progress: number;
};

/** One mini stage: shot A leaving and shot B entering by `kind`. */
export function SceneTransitionStage({
  kind,
  progress,
}: Readonly<Props>): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const props = { kind, ...TransitionDemosShared.STAGE };
  return (
    <div className={css.sceneTransitionStageMiniStage}>
      <div
        className={clsx(
          css.sceneTransitionStageMiniFrame,
          css.sceneTransitionStageMiniFrameScene,
        )}
      >
        <SceneTransitionShot
          label="A"
          style={getSceneTransitionStyle({
            progress,
            entering: false,
            props,
            theme: settingsTheme,
          })}
        />
        <SceneTransitionShot
          label="B"
          style={getSceneTransitionStyle({
            progress,
            entering: true,
            props,
            theme: settingsTheme,
          })}
        />
      </div>
      <span className={css.sceneTransitionStageCaption}>{kind}</span>
    </div>
  );
}
