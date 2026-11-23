import { positioned } from "../../../positioned";
import type { BarComparisonMotion } from "../../BarComparisonMotion/BarComparisonMotion";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  panel: PanelInput["panel"];
  rect: PanelInput["rect"];
  theme: PanelInput["theme"];
  motion: PanelInput["motion"];
  beats: ReturnType<typeof BarComparisonMotion.getBarComparisonBeats>;
  captionTop: number;
  scene: PanelInput["theme"]["semantic"]["color"]["scene"];
};
/** Renders bar caption. */
export function BarCaption({
  frame,
  panel,
  rect,
  theme,
  motion,
  beats,
  captionTop,
  scene,
}: Readonly<Props>): ReactNode {
  return (
    <p
      style={{
        ...positioned({ ...rect, y: captionTop, height: 40 }),
        margin: 0,
        fontSize: theme.semantic.text.stage.sceneBody.fontSize,
        color: scene.mutedForeground,
        ...motion.enter(frame, beats.heroAt + motion.stagger.list, {
          dur: motion.panel,
        }),
      }}
    >
      {panel.caption}
    </p>
  );
}

import type { PanelProps as PanelInput } from "../../BarComparisonScene.types";
