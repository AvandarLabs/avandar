import { RevealedLine } from "./RevealedLine";
import { TypographySceneShared } from "./TypographySceneShared/TypographySceneShared";
import { WordMaskedLine } from "./WordMaskedLine";
import type { TypographySceneProps } from "../scenes.types";
import type { ReactNode } from "react";

type TypographyLineOptions = TypographySceneProps & {
  line: string;
  fontSize: number;
  isCaption: boolean;
  isCentered: boolean;
  revealAt: number;
};
/**
 * One fitted line, in the scene's reveal mode. Display lines take the
 * `text.stage.sceneHeading` weight and tracking at their fitted size,
 * captions the `text.stage.sceneBody` weight; emphasised words are the
 * scene's strong brand colour.
 */
export function TypographyLine({
  frame,
  line,
  fontSize,
  isCaption,
  isCentered,
  revealAt,
  emphasis = [],
  revealMode = "word-mask",
  wordStaggerFrames = 3,
}: TypographyLineOptions): ReactNode {
  const getWordStyle = TypographySceneShared.useWordStyle({
    fontSize,
    isCaption,
    emphasis,
  });
  const words = line.split(/\s+/);
  const lineProps = { frame, words, fontSize, isCentered, revealAt };
  if (revealMode !== "word-mask") {
    return (
      <RevealedLine
        {...lineProps}
        revealMode={revealMode}
        getWordStyle={getWordStyle}
      />
    );
  }
  return (
    <WordMaskedLine
      {...lineProps}
      wordStaggerFrames={wordStaggerFrames}
      getWordStyle={getWordStyle}
    />
  );
}
