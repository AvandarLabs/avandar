import { TextReveal } from "../../../TextReveal/TextReveal";
import type { Rect } from "../../../layout/SceneGeometry";
import type { RenderRowOptions as Options } from "../../BarComparisonScene.types";
import type { ReactNode, CSSProperties } from "react";

type Props = {
  frame: number;
  rect: Rect;
  row: Options["row"];
  beats: Options["beats"];
  motion: Options["motion"];
  labelWidth: number;
  scene: Options["theme"]["semantic"]["color"]["scene"];
  textStyle: CSSProperties;
  rowAt: number;
};
/** Renders bar row label. */
export function BarRowLabel({
  frame,
  rect,
  row,
  beats,
  motion,
  labelWidth,
  scene,
  textStyle,
  rowAt,
}: Readonly<Props>): ReactNode {
  return (
    <div
      style={{
        ...textStyle,
        left: rect.x,
        width: labelWidth - 16,
        overflow: "hidden",
        textOverflow: "ellipsis",
        color: scene.mutedForeground,
        ...TextReveal.getLineRevealStyle({
          frame,
          at: beats.labelsAt + rowAt,
          mode: "line-fade",
          options: { rise: 0 },
          motion,
        }),
      }}
    >
      {row.label}
    </div>
  );
}
