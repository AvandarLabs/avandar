import { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import { PAIR_BOXES } from "../windowTilt";
import { type StatLineProps } from "./RaceStatsShared/RaceStatsShared.types";
import type { ReactNode } from "react";

type Props = StatLineProps & Readonly<{ stat: string }>;
/** The stat under the window, right-aligned to its edge. */
export function RaceStat({ stat, ...line }: Readonly<Props>): ReactNode {
  const tokens = useVideoTokens();
  const box = PAIR_BOXES[line.side];
  return (
    <div
      style={{
        position: "absolute",
        right: line.width * (1 - box.x - box.width) + line.width * 0.01,
        top: line.height * 0.885,
        fontSize: line.height * 0.026,
        color: tokens.color.scene.mutedForeground,
        ...line.arrive,
      }}
    >
      {stat}
    </div>
  );
}
