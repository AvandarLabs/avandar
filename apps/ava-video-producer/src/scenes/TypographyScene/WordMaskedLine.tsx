import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { MaskedWord } from "./MaskedWord";
import { type LineProps } from "./TypographySceneShared/TypographySceneShared.types";
import type { ReactNode } from "react";

type WordMaskedLineOptions = LineProps & { wordStaggerFrames: number };
/** Each word rising out from behind its own mask, staggered. */
export function WordMaskedLine({
  frame,
  words,
  fontSize,
  isCentered,
  revealAt,
  wordStaggerFrames,
  getWordStyle,
}: WordMaskedLineOptions): ReactNode {
  const motion = useVideoMotion();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isCentered ? "center" : "flex-start",
        gap: fontSize * 0.3,
        maxWidth: "100%",
      }}
    >
      {words.map((word, index) => {
        const progress = motion.ramp(
          frame,
          revealAt + index * wordStaggerFrames,
          motion.rise.duration,
          motion.rise.easing,
        );
        return (
          // prettier-ignore
          // Each word occupies its authored reveal slot. Repeated
          // words are valid and the line never reorders or filters
          // them.
          // react-doctor-disable-next-line no-array-index-as-key
          <MaskedWord key={`${index}-${word}`}
            fontSize={fontSize}
            progress={progress}
            style={getWordStyle(word)}
          >
            {word}
          </MaskedWord>
        );
      })}
    </div>
  );
}
