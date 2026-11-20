import { mix, mixToken } from "../../../motion";
import { useVideoTokens } from "../../../videoTheme/useVideoTheme";
import { formatMetric } from "../../layout/layout";
import { type WindowStage } from "../WindowMotion/WindowMotion.types";
import { RaceStatsShared } from "./RaceStatsShared/RaceStatsShared";
import { type StatLineProps } from "./RaceStatsShared/RaceStatsShared.types";
import type { RaceColumn } from "../../scenes.types";
import type { ReactNode } from "react";

type RaceCounterOptions = StatLineProps &
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
}: RaceCounterOptions): ReactNode {
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
        color: mixToken(done, scene.foreground, scene.brand),
        ...line.arrive,
      }}
    >
      {formatMetric(
        mix(elapsed, counter.from ?? 0, counter.to),
        counter.precision ?? 1,
      )}
      {counter.unit ?? ""}
    </div>
  );
}
