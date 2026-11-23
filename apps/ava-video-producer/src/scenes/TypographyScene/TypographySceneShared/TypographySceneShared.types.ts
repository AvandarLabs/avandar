import type { CSSProperties } from "react";
/** Inputs shared by the TypographyScene visuals. */
export type LineProps = Readonly<{
  frame: number;
  words: readonly string[];
  fontSize: number;
  isCentered: boolean;
  revealAt: number;
  getWordStyle: (word: string) => CSSProperties;
}>;
