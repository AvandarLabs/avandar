import { Motion } from "../motion";
import { StageTheme } from "../scenes/StageTheme/StageTheme";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoTheme, useVideoTokens } from "../videoTheme/videoThemeHelpers";
import { TitleCardShared } from "./TitleCardShared/TitleCardShared";
import type { ReactNode } from "react";

type Props = {
  kicker: string;
  frame: number;
};
/** Reveals the secondary title line after the name for `TitleCardContent`. */
export function TitleCardKicker({ kicker, frame }: Readonly<Props>): ReactNode {
  const tokens = useVideoTokens();
  const { spacing } = useVideoTheme().mantine;
  const motion = useVideoMotion();
  const kickerIn = motion.ramp(
    frame,
    TitleCardShared.KICKER_IN,
    motion.sheet,
    motion.entrance.easing,
  );
  return (
    <div
      style={{
        marginTop: spacing["22"],
        ...StageTheme.getStageTextStyle({ role: tokens.text.stage.kicker }),
        opacity: kickerIn,
        transform: `translateY(${Motion.mix({
          t: kickerIn,
          from: TitleCardShared.KICKER_RISE,
          to: 0,
        }).toFixed(2)}px)`,
      }}
    >
      {kicker}
    </div>
  );
}
