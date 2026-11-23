import { clsx } from "clsx";
import { MotionSettings } from "../../../../../motion-components/MotionSettings/MotionSettings";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { SceneTransitionStage } from "../SceneTransitionStage/SceneTransitionStage";
import { TransitionDemosShared } from "../TransitionDemosShared/TransitionDemosShared";
import css from "./SceneTransitionDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** The scene transition kinds at the same progress, side by side. */
export function SceneTransitionDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const progress = MotionSettings.getMotionProgress({
    frame,
    at: 15,
    duration: 30,
    options: undefined,
    fallback: undefined,
    theme: settingsTheme,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        "getSceneTransitionStyle({ progress, entering, props: { kind, width, height } })"
      }
      readouts={[
        {
          name: "progress",
          value: DemoTheme.formatReadout({ value: progress }),
        },
        { name: "window", value: "15f to 45f" },
      ]}
    >
      <div
        className={clsx(
          css.sceneTransitionDemoMiniStages,
          css.sceneTransitionDemoFiveUp,
        )}
      >
        {TransitionDemosShared.SCENE_KINDS.map((kind) => {
          return (
            <SceneTransitionStage key={kind} kind={kind} progress={progress} />
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
