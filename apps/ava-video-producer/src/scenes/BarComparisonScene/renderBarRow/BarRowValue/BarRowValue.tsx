import { TextReveal } from "../../../TextReveal/TextReveal";
import { BarComparisonMotion } from "../../BarComparisonMotion/BarComparisonMotion";
import type { Rect } from "../../../layout/SceneGeometry";
import type { RenderRowOptions as Options } from "../../BarComparisonScene.types";
import type { ReactNode, CSSProperties } from "react";

type Props = {
  frame: number;
  panel: Options["panel"];
  rect: Rect;
  row: Options["row"];
  beats: Options["beats"];
  motion: Options["motion"];
  labelWidth: number;
  barWidth: number;
  scene: Options["theme"]["semantic"]["color"]["scene"];
  textStyle: CSSProperties;
  rowAt: number;
};
/** Renders bar row value. */
export function BarRowValue({
  frame,
  panel,
  rect,
  row,
  beats,
  motion,
  labelWidth,
  barWidth,
  scene,
  textStyle,
  rowAt,
}: Readonly<Props>): ReactNode {
  return (
    <div
      style={{
        ...textStyle,
        left: rect.x + labelWidth + barWidth,
        width: rect.width - labelWidth - barWidth,
        textAlign: "right",
        fontVariantNumeric: "tabular-nums",
        color: scene.foreground,
        ...TextReveal.getLineRevealStyle({
          frame,
          at: beats.valuesAt + rowAt,
          mode: "line-fade",
          options: { rise: 0 },
          motion,
        }),
      }}
    >
      {BarComparisonMotion.rowValueLabel({
        row,
        precision: panel.precision ?? 0,
      })}
    </div>
  );
}
