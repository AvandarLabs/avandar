import { useVideoTokens } from "../../../videoTheme/useVideoTheme";
import type { CSSProperties } from "react";
/**
 * Each word's type: the caption body or the scene heading role, with
 * emphasised words in the strong brand colour.
 */
function useWordStyle({
  fontSize,
  isCaption,
  emphasis,
}: Readonly<{
  fontSize: number;
  isCaption: boolean;
  emphasis: readonly string[];
}>): (word: string) => CSSProperties {
  const tokens = useVideoTokens();
  const heading = tokens.text.stage.sceneHeading;
  const role = isCaption ? tokens.text.stage.sceneBody : heading;
  return (word: string) => {
    return {
      display: "inline-block",
      fontSize,
      fontWeight: role.fontWeight,
      letterSpacing:
        isCaption || heading.letterSpacing === undefined
          ? undefined
          : `${heading.letterSpacing}em`,
      color: emphasis.includes(word)
        ? tokens.color.scene.brandStrong
        : tokens.color.scene.foreground,
    };
  };
}
/** Shared values and calculations for the TypographyScene visuals. */
export const TypographySceneShared = {
  /** Each word's type: the caption body or the scene heading role, with
    emphasised words in the strong brand colour. */
  useWordStyle,
} as const;
