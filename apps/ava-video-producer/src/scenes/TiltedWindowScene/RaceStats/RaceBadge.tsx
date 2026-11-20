import { useVideoTokens } from "../../../videoTheme/useVideoTheme";
import { type StatLineProps } from "./RaceStatsShared/RaceStatsShared.types";
import type { ReactNode } from "react";

type RaceBadgeOptions = StatLineProps & Readonly<{ badge: string }>;
/**
 * Places the comparison badge beside the arriving statistics in `RaceStats`.
 */
export function RaceBadge({ badge, ...line }: RaceBadgeOptions): ReactNode {
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
