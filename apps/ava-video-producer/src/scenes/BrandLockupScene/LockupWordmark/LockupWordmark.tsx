import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { positioned } from "../../positioned";
import { TextReveal } from "../../TextReveal/TextReveal";
import { LockupWordmarkText } from "./LockupWordmarkText";
import type { Rect } from "../../layout/SceneGeometry";
import type { BrandLockupSceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = BrandLockupSceneProps & {
  wordmark: string;
  box: Rect;
  fontSize: number;
  atFrame: number;
};
/** The wordmark beside the mark, wiping in on its cue and out on the exit. */
export function LockupWordmark({
  frame,
  exit,
  wordmark,
  box,
  fontSize,
  atFrame,
}: Props): ReactNode {
  const motion = useVideoMotion();
  return (
    <div
      style={{
        ...positioned(box),
        ...(exit
          ? TextReveal.getWipeExitStyle({
              frame,
              at: exit.atFrame,
              durationInFrames: motion.chip,
              motion,
            })
          : {}),
      }}
    >
      <LockupWordmarkText {...{ frame, wordmark, box, fontSize, atFrame }} />
    </div>
  );
}
