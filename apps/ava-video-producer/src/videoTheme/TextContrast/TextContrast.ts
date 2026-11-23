import { luminance } from "@mantine/core";
import { getResolvedTokenValue } from "../getResolvedTokenValue";
import { TokenCatalog } from "../tokenCatalog/TokenCatalog/TokenCatalog";
import type {
  ResolvedTypeStyle,
  ResolvedVideoTheme,
} from "../videoTheme.types";
/** A WCAG 2 contrast level for text. */
export type WcagLevel = "AAA" | "AA" | "fail";
/** One text role's contrast against the ground. */
export type TextContrast = Readonly<{
  path: string;
  ratio: number;
  level: WcagLevel;
}>;
/** The WCAG 2 contrast ratio of two colours, from 1 to 21. */
function _getContrastRatioFromColors({
  foreground,
  background,
}: Readonly<{
  foreground: string;
  background: string;
}>): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (left, right) => {
      return right - left;
    },
  );
  return (lighter + 0.05) / (darker + 0.05);
}
/** Whether WCAG treats a style as large text: 24 px, or 18.66 px at bold. */
function _isLargeTypeStyle(
  style: Pick<ResolvedTypeStyle, "fontSize" | "fontWeight">,
): boolean {
  return (
    style.fontSize >= 24 || (style.fontSize >= 18.66 && style.fontWeight >= 700)
  );
}
/** The WCAG level a ratio reaches for normal or large text. */
function _getWcagLevelFromContrast({
  ratio,
  isLargeText,
}: Readonly<{
  ratio: number;
  isLargeText: boolean;
}>): WcagLevel {
  const [aa, aaa] = isLargeText ? [3, 4.5] : [4.5, 7];
  return ratio >= aaa ? "AAA" : ratio >= aa ? "AA" : "fail";
}
/**
 * The contrast of every text role (semantic and component) against what it
 * is drawn on: the theme's ground, or the colour its `contrastGround` names,
 * such as the scene ground for scene text. Use it to badge text colours in
 * the editor or to check a generated theme before saving it.
 */
function _listTextContrastFromTheme(theme: ResolvedVideoTheme): TextContrast[] {
  return TokenCatalog.listTokenDefinitions()
    .filter(({ definition }) => {
      return definition.kind === "typeStyle";
    })
    .map(({ path, definition }) => {
      const style = getResolvedTokenValue({
        theme,
        path,
      }) as ResolvedTypeStyle;
      const ground = definition.contrastGround
        ? String(
            getResolvedTokenValue({
              theme,
              path: definition.contrastGround,
            }),
          )
        : theme.semantic.color.ground;
      const ratio = _getContrastRatioFromColors({
        foreground: style.color,
        background: ground,
      });
      return {
        path,
        ratio,
        level: _getWcagLevelFromContrast({
          ratio,
          isLargeText: _isLargeTypeStyle(style),
        }),
      };
    });
}

/** Measures text contrast against theme surfaces for accessibility reports. */
export const TextContrast = {
  /** The WCAG 2 contrast ratio of two colours, from 1 to 21. */
  getContrastRatioFromColors: _getContrastRatioFromColors,
  /** Whether WCAG treats a style as large text: 24 px, or 18.66 px at bold. */
  isLargeTypeStyle: _isLargeTypeStyle,
  /** The WCAG level a ratio reaches for normal or large text. */
  getWcagLevelFromContrast: _getWcagLevelFromContrast,
  /**
   * The contrast of every text role (semantic and component) against what it is
   * drawn on: the theme's ground, or the colour its `contrastGround` names,
   * such as the scene ground for scene text.
   */
  listTextContrastFromTheme: _listTextContrastFromTheme,
};
