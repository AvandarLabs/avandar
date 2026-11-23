import { Motion } from "../motion";
import { StageTheme } from "../scenes/StageTheme/StageTheme";
import { useVideoTheme, useVideoTokens } from "../videoTheme/videoThemeHelpers";
import { TitleCardShared } from "./TitleCardShared/TitleCardShared";
import type { ReactNode } from "react";

type Props = {
  word: string;
  progress: number;
};
/** Reveals one title word through a rising mask for `TitleCardWords`. */
export function TitleCardWord({ word, progress }: Readonly<Props>): ReactNode {
  const tokens = useVideoTokens();
  const { spacing } = useVideoTheme().mantine;
  const titleRole = tokens.text.stage.title;
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        lineHeight: titleRole.lineHeight,
        paddingBottom: spacing["6"],
      }}
    >
      <span
        style={{
          display: "inline-block",
          // Negative tracking is what makes a title look set
          // rather than typed. At 92px, default tracking reads
          // loose and webby.
          ...StageTheme.getStageTextStyle({
            role: titleRole,
            fields: TitleCardShared.WORD_FIELDS,
          }),
          // translateY only. Scaling a headline is the one thing
          // that must never happen here: it bites hardest on a
          // title, where type is the whole frame.
          transform: `translateY(${Motion.mix({
            t: progress,
            from: 110,
            to: 0,
          }).toFixed(2)}%)`,
          // No opacity here, on purpose. Masking and fading at
          // the same time cancel out: the fade makes the word
          // visible above the edge it is supposed to be emerging
          // from, and what reads is a slide transition again. The
          // mask alone is the effect.
        }}
      >
        {word}
      </span>
    </span>
  );
}
