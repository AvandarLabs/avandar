import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { positioned } from "../../positioned";
import { getWipeExitStyle } from "../../textReveal/textReveal";
import { LockupWordmarkText } from "./LockupWordmarkText";
import type { Rect } from "../../layout/layout";
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
          ? getWipeExitStyle({
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
