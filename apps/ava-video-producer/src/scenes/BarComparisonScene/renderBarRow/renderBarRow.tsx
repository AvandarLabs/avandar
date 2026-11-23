import { StageTheme } from "../../StageTheme/StageTheme";
import { BarRowBar } from "./BarRowBar/BarRowBar";
import { BarRowLabel } from "./BarRowLabel/BarRowLabel";
import { BarRowValue } from "./BarRowValue/BarRowValue";
import type { RenderRowOptions as Options } from "../BarComparisonScene.types";
import type { CSSProperties, ReactNode } from "react";

/** One row's label, bar and value, each erasable on its own. */
export function renderBarRow({
  erasable,
  ...options
}: Readonly<Options>): ReactNode[] {
  const content = _makeBarRowContentFromOptions(options);
  const { rowIndex } = options;
  return [
    erasable(<BarRowLabel {...content} />, `label-${rowIndex}`),
    erasable(<BarRowBar {...content} />, `bar-${rowIndex}`),
    erasable(<BarRowValue {...content} />, `value-${rowIndex}`),
  ];
}

type BarRowContent = Omit<Options, "erasable"> & {
  fontSize: number;
  barHeight: number;
  labelWidth: number;
  barWidth: number;
  center: number;
  scene: Options["theme"]["semantic"]["color"]["scene"];
  textStyle: CSSProperties;
  rowAt: number;
  grow: number;
};
/** Fits row slots and samples bar growth for the current frame. */
function _makeBarRowContentFromOptions(
  options: Readonly<Omit<Options, "erasable">>,
): BarRowContent {
  const { rect, pitch, top, rowIndex, theme, frame, beats, motion } = options;

  const fontSize = Math.min(26, pitch * 0.42);
  const barHeight = pitch * 0.58;
  const labelWidth = rect.width * 0.3;
  const barWidth = rect.width * 0.48;
  const center = top + pitch / 2;
  const scene = theme.semantic.color.scene;
  const textStyle = {
    position: "absolute" as const,
    top: center - fontSize * 0.65,
    fontSize,
    ...StageTheme.getStageTextStyle({
      role: theme.semantic.text.stage.barLabel,
      fields: ["lineHeight"],
    }),
    whiteSpace: "nowrap" as const,
  };
  const rowAt = rowIndex * motion.stagger.list;
  const grow = motion.ramp(
    frame,
    beats.barsAt + rowAt,
    motion.sheet,
    motion.rise.easing,
  );

  return {
    ...options,
    barEdge: options.barEdge,
    fontSize,
    barHeight,
    labelWidth,
    barWidth,
    center,
    scene,
    textStyle,
    rowAt,
    grow,
  };
}
