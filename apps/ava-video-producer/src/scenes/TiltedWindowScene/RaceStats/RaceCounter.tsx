import { Motion } from "../../../motion";
import { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import { TextLayout } from "../../layout/TextLayout";
import { type WindowStage } from "../WindowMotion/WindowMotion.types";
import { RaceStatsShared } from "./RaceStatsShared/RaceStatsShared";
import { type StatLineProps } from "./RaceStatsShared/RaceStatsShared.types";
import type { RaceColumn } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = StatLineProps &
  Readonly<{
    frame: number;
    counter: RaceColumn["counter"];
    motion: WindowStage["motion"];
  }>;
/** The live counter, turning to the brand colour as it finishes. */
export function RaceCounter({
  frame,
  counter,
  motion,
  ...line
}: Readonly<Props>): ReactNode {
  const scene = useVideoTokens().color.scene;
  const { elapsed, done } = RaceStatsShared.getCounterProgress({
    frame,
    counter,
    motion,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: RaceStatsShared.getStatLeft(line),
        top: line.height * 0.825,
        fontSize: line.height * 0.1,
        fontWeight: line.fontWeight,
        fontVariantNumeric: "tabular-nums",
        color: Motion.mixToken({
          t: done,
          from: scene.foreground,
          to: scene.brand,
        }),
        ...line.arrive,
      }}
    >
      {TextLayout.formatMetric({
        value: Motion.mix({
          t: elapsed,
          from: counter.from ?? 0,
          to: counter.to,
        }),
        precision: counter.precision ?? 1,
      })}
      {counter.unit ?? ""}
    </div>
  );
}
