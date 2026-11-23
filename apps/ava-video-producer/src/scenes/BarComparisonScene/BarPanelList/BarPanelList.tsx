import { BarPanel } from "../BarPanel/BarPanel";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { ResolvedVideoTheme } from "../../../videoTheme/videoTheme.types";
import type { Rect } from "../../layout/SceneGeometry";
import type { BarComparisonSceneProps as SceneInput } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  panels: SceneInput["panels"];
  props: Omit<SceneInput, "panels">;
  bounds: Rect;
  panelWidth: number;
  gap: number;
  eraseStarts: number[][] | undefined;
  theme: ResolvedVideoTheme;
  motion: VideoMotion;
};
/** Renders bar panel list. */
export function BarPanelList({
  panels,
  props,
  bounds,
  panelWidth,
  gap,
  eraseStarts,
  theme,
  motion,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {panels.map((panel, panelIndex) => {
        return (
          <BarPanel
            key={panelIndex}
            {...props}
            panels={panels}
            panel={panel}
            panelIndex={panelIndex}
            rect={{
              ...bounds,
              x: bounds.x + panelIndex * (panelWidth + gap),
              width: panelWidth,
            }}
            eraseStarts={eraseStarts?.[panelIndex]}
            theme={theme}
            motion={motion}
          />
        );
      })}
    </>
  );
}
