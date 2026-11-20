import { mix } from "../../motion";
import { useVideoTheme, useVideoTokens } from "../../videoTheme/useVideoTheme";
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
          transform: `translateY(${mix(progress, 110, 0).toFixed(2)}%)`,
        }}
      >
        {children}
      </span>
    </span>
  );
}
