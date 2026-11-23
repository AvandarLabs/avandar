import { AbsoluteFill, Sequence } from "remotion";
import { MotionLab } from "../../compositions/MotionLab/MotionLab";
import { TitleCard, TITLE_LEN } from "../../TitleCard/TitleCard";
import type { ReactNode } from "react";

type Props = Readonly<{ frame: number }>;
/** Plays the motion vocabulary's title and live motion study. */
export function MotionLabPicture({ frame }: Props): ReactNode {
  return (
    <AbsoluteFill style={{ background: "var(--ground)" }}>
      {frame < TITLE_LEN ? (
        <TitleCard
          name="Motion vocabulary"
          kicker="Four building blocks, one visual language"
          frame={frame}
        />
      ) : null}
      <Sequence from={TITLE_LEN}>
        <MotionLab />
      </Sequence>
    </AbsoluteFill>
  );
}
