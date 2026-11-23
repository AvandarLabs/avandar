import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import { SceneGeometry } from "../layout/SceneGeometry";
import { SceneHeader } from "./SceneHeader/SceneHeader";
import css from "./SceneShell.module.css";
import type { SceneBase } from "../scenes.types";
import type { ReactNode } from "react";

type Props = SceneBase & {
  children: ReactNode;
};
/**
 * Shared chrome for a scene: the ground, title/kicker header, and content area.
 * The title is `text.stage.sceneHeading` fitted to the header, the kicker
 * `text.stage.sceneBody` in the muted foreground, on the scene palette.
 */
export function SceneShell({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  headingReveal,
  children,
}: Readonly<Props>): ReactNode {
  SceneGeometry.assertFinite({ value: frame, name: "scene frame" });
  const tokens = useVideoTokens();
  const { spacing } = useVideoTheme().mantine;
  const motion = useVideoMotion();
  const heading = tokens.text.stage.sceneHeading;
  return (
    <div
      className={css.sceneShelldiv1}
      style={{
        width,
        height,
        background: tokens.color.scene.ground,
        color: tokens.color.scene.foreground,
        fontFamily: heading.fontFamily,
      }}
    >
      {title || kicker ? (
        <SceneHeader
          {...{
            frame,
            width,
            title,
            kicker,
            headingReveal,
            tokens,
            spacing,
            motion,
          }}
        />
      ) : null}
      {children}
    </div>
  );
}
