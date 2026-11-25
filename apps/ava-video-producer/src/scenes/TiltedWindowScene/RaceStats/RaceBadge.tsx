import { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import { type StatLineProps } from "./RaceStatsShared/RaceStatsShared.types";
import type { ReactNode } from "react";

type Props = StatLineProps & Readonly<{ badge: string }>;
/**
 * Places the comparison badge beside the arriving statistics in `RaceStats`.
 */
export function RaceBadge({ badge, ...line }: Readonly<Props>): ReactNode {
  const tokens = useVideoTokens();
  return (
    <div
      style={{
        position: "absolute",
        right: line.width * 0.04,
        top: line.height * 0.095,
        fontSize: line.height * 0.026,
        fontWeight: line.fontWeight,
        color: tokens.color.scene.brand,
        ...line.arrive,
      }}
    >
      {badge}
    </div>
  );
}
