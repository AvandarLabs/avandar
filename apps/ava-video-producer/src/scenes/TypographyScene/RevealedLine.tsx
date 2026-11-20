import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { getLineRevealStyle } from "../textReveal/textReveal";
import { type LineProps } from "./TypographySceneShared/TypographySceneShared.types";
import type { TextRevealMode } from "../textReveal/textReveal";
import type { ReactNode } from "react";

type RevealedLineOptions = LineProps & {
  revealMode: Exclude<TextRevealMode, "word-mask">;
};
/** The whole line revealed at once by a line reveal style. */
export function RevealedLine({
  frame,
  words,
  fontSize,
  isCentered,
  revealAt,
  revealMode,
  getWordStyle,
}: RevealedLineOptions): ReactNode {
  const motion = useVideoMotion();
  const lineHeight = useVideoTheme().mantine.lineHeights["108"];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isCentered ? "center" : "flex-start",
        gap: fontSize * 0.3,
        lineHeight,
        paddingBottom: fontSize * 0.07,
        ...getLineRevealStyle({
          frame,
          at: revealAt,
          mode: revealMode,
          options: {},
          motion,
        }),
      }}
    >
      {words.map((word, index) => {
        return (
          <span key={`${index}-${word}`} style={getWordStyle(word)}>
            {word}
          </span>
        );
      })}
    </div>
  );
}
