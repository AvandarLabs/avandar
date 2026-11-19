import { luminance } from "@mantine/core";
import { getResolvedTokenValue } from "../getResolvedTokenValue";
import { listTokenDefinitions } from "../tokenCatalog/tokenCatalogHelpers";
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
export function getContrastRatioFromColors(
  foreground: string,
  background: string,
): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (left, right) => {
      return right - left;
    },
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** Whether WCAG treats a style as large text: 24 px, or 18.66 px at bold. */
export function isLargeTypeStyle(
  style: Pick<ResolvedTypeStyle, "fontSize" | "fontWeight">,
): boolean {
  return (
    style.fontSize >= 24 || (style.fontSize >= 18.66 && style.fontWeight >= 700)
  );
}

/** The WCAG level a ratio reaches for normal or large text. */
export function getWcagLevelFromContrast(
  ratio: number,
  isLargeText: boolean,
): WcagLevel {
  const [aa, aaa] = isLargeText ? [3, 4.5] : [4.5, 7];
  return ratio >= aaa ? "AAA" : ratio >= aa ? "AA" : "fail";
}

/**
 * The contrast of every text role (semantic and component) against what it
 * is drawn on: the theme's ground, or the colour its `contrastGround` names,
 * such as the scene ground for scene text. Use it to badge text colours in
 * the editor or to check a generated theme before saving it.
 */
export function listTextContrastFromTheme(
  theme: ResolvedVideoTheme,
): TextContrast[] {
  return listTokenDefinitions()
    .filter(({ definition }) => {
      return definition.kind === "typeStyle";
    })
    .map(({ path, definition }) => {
      const style = getResolvedTokenValue(theme, path) as ResolvedTypeStyle;
      const ground = definition.contrastGround
        ? String(getResolvedTokenValue(theme, definition.contrastGround))
        : theme.semantic.color.ground;
      const ratio = getContrastRatioFromColors(style.color, ground);
      return {
        path,
        ratio,
        level: getWcagLevelFromContrast(ratio, isLargeTypeStyle(style)),
      };
    });
}
