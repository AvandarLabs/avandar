import { RaceStatsShared } from "./RaceStatsShared/RaceStatsShared";
import { type StatLineProps } from "./RaceStatsShared/RaceStatsShared.types";
import type { ReactNode } from "react";

type RaceLabelOptions = StatLineProps & Readonly<{ label: string }>;
/** Labels a comparison column as its statistics arrive in `RaceStats`. */
export function RaceLabel({ label, ...line }: RaceLabelOptions): ReactNode {
  return (
    <div
      style={{
        position: "absolute",
        left: RaceStatsShared.getStatLeft(line),
        top: line.height * 0.085,
        fontSize: line.height * 0.05,
        fontWeight: line.fontWeight,
        ...line.arrive,
      }}
    >
      {label}
    </div>
  );
}
