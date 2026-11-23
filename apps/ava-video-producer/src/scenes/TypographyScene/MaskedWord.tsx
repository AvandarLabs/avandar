import { Motion } from "../../motion";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  fontSize: number;
  progress: number;
  style: CSSProperties;
  children: string;
};
/** Reveals a word through a rising mask for `WordMaskedLine`. */
export function MaskedWord({
  fontSize,
  progress,
  style,
  children,
}: Readonly<Props>): ReactNode {
  const lineHeight = useVideoTheme().mantine.lineHeights["108"];
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        paddingBottom: fontSize * 0.07,
        lineHeight,
      }}
    >
      <span
        style={{
          ...style,
          transform: `translateY(${Motion.mix({
            t: progress,
            from: 110,
            to: 0,
          }).toFixed(2)}%)`,
        }}
      >
        {children}
      </span>
    </span>
  );
}
