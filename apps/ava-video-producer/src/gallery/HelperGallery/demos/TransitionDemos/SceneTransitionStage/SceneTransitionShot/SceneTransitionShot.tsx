import { clsx } from "clsx";
import css from "./SceneTransitionShot.module.css";
import type { CSSProperties, ReactNode } from "react";

type Props = { label: "A" | "B"; style: CSSProperties };
/** Presents one labelled side of the scene handover preview. */
export function SceneTransitionShot({
  label,
  style,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={clsx(
        css.sceneTransitionShotShot,
        label === "A"
          ? css.sceneTransitionShotShotA
          : css.sceneTransitionShotShotB,
      )}
      style={style}
    >
      {label}
    </div>
  );
}
