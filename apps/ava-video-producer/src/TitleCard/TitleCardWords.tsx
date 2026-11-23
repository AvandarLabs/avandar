import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoTheme } from "../videoTheme/videoThemeHelpers";
import { TitleCardShared } from "./TitleCardShared/TitleCardShared";
import { TitleCardWord } from "./TitleCardWord";
import type { ReactNode } from "react";

type Props = { name: string; frame: number };

/** The name, one masked word at a time. */
export function TitleCardWords({ name, frame }: Readonly<Props>): ReactNode {
  const { spacing } = useVideoTheme().mantine;
  const motion = useVideoMotion();
  return (
    <div style={{ display: "flex", gap: spacing["22"] }}>
      {name.split(" ").map((word, i) => {
        const t = motion.ramp(
          frame,
          TitleCardShared.WORD_IN + i * motion.rise.stagger,
          motion.rise.duration,
          motion.rise.easing,
        );
        return (
          // prettier-ignore
          // One mask per word, never one mask around several lines. The
          // word travels out from behind a hard edge; a word that
          // merely fades up reads as a slide transition, not as
          // typography.
          // Words occupy fixed reveal slots in one authored title.
          // Repeated words need distinct slots, and this renderer
          // never reorders or filters them.
          // react-doctor-disable-next-line no-array-index-as-key
          <TitleCardWord key={`${word}-${i}`} word={word} progress={t} />
        );
      })}
    </div>
  );
}
