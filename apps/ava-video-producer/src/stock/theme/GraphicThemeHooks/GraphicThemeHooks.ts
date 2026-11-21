import { propEq } from "@avandar/utils";
import { filterProps } from "@mantine/core";
import { createContext, useContext, useMemo } from "react";
import { makeResolvedVideoThemeFromSource } from "../../../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import {
  makeVideoMotionFromTokens,
  type VideoMotion,
} from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import {
  makeVideoShapeScalesFromSemanticTokens,
  type VideoShapeScales,
} from "../../../videoTheme/makeVideoShapeScalesFromSemanticTokens/makeVideoShapeScalesFromSemanticTokens";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { SEMANTIC_TOKENS } from "../../../videoTheme/tokenCatalog/semanticTokens/semanticTokens";
import {
  VideoTokenUsageContext,
  TokenUsage,
} from "../../../videoTheme/TokenUsage/TokenUsage";
import { VideoEffectFilters } from "../../../videoTheme/VideoEffectFilters/VideoEffectFilters";
import { useVideoThemeContext } from "../../../videoTheme/videoThemeHelpers";
import type {
  ResolvedVideoComponents,
  ResolvedVideoSemantic,
  ResolvedVideoTheme,
  VideoComponentName,
} from "../../../videoTheme/videoTheme.types";
/**
 * The SVG id of the stock graphic being drawn, so shapes can reference the
 * graphic's own `<defs>` (filters, gradients). Set by `StockGraphic`.
 */
const GraphicIdContext = createContext("stock-graphic");
/**
 * The resolved theme a stock shape draws with: the surrounding theme, or
 * `classic` with no provider. Prefer `useGraphicTokens` and
 * `useGraphicProps`; use this only for whole-theme work such as effect defs.
 */
function useGraphicTheme(): ResolvedVideoTheme {
  return (
    useVideoThemeContext()?.theme ??
    makeResolvedVideoThemeFromSource(DEFAULT_VIDEO_THEME_SOURCE)
  );
}
/**
 * Semantic tokens for a stock shape: the surrounding theme, or `classic`
 * when the shape renders with no provider (unit tests and direct renderer
 * calls). Reads are reported like `useVideoTokens`.
 */
function useGraphicTokens(): ResolvedVideoSemantic {
  const theme = useGraphicTheme();
  const report = useContext(VideoTokenUsageContext);
  return useMemo(() => {
    return report
      ? TokenUsage.makeProxyFromTarget({
          value: theme.semantic,
          catalog: SEMANTIC_TOKENS,
          basePath: [],
          report,
        })
      : theme.semantic;
  }, [theme, report]);
}
/**
 * A stock shape's props: its component defaults under the props it was
 * given, merged with Mantine's own `filterProps` the way `useProps` does.
 * Falls back to `classic` like `useGraphicTokens`, and reports each default
 * the shape relied on.
 */
function useGraphicProps<
  Name extends VideoComponentName,
  Props extends Partial<ResolvedVideoComponents[Name]>,
>({
  name,
  props,
}: Readonly<{
  name: Name;
  props: Props;
}>): ResolvedVideoComponents[Name] & Props {
  const defaults = useGraphicTheme().components[name];
  const report = useContext(VideoTokenUsageContext);
  const given: Readonly<Record<string, unknown>> = filterProps(props);
  if (report) {
    Object.keys(defaults)
      .filter((key) => {
        return !(key in given);
      })
      .forEach((key) => {
        return report(`components.${name}.${key}`);
      });
  }
  return { ...defaults, ...given } as ResolvedVideoComponents[Name] & Props;
}
/**
 * A step of a theme's type scale in pixels, for SVG text set larger or
 * smaller than its role, for example a study heading at the `29` step.
 * Throws on a step the theme does not define.
 */
function _getFontSizeFromStep({
  theme,
  step,
}: Readonly<{
  theme: Pick<ResolvedVideoTheme, "mantine">;
  step: string;
}>): number {
  const size = theme.mantine.fontSizes[step];
  if (size === undefined) {
    throw new Error(`fontSizes.${step} is not a step of the type scale`);
  }
  return Number.parseFloat(size);
}
/**
 * A step of the surrounding theme's type scale in pixels, for a stock
 * shape that draws its own `<text>`, such as a legend value. See
 * `getFontSizeFromStep`.
 */
function useGraphicFontSize(step: string): number {
  return _getFontSizeFromStep({ theme: useGraphicTheme(), step });
}
/** Tempo-scaled motion for a stock shape. See `VideoMotion`. */
function useGraphicMotion(): VideoMotion {
  const { motion } = useGraphicTokens();
  return useMemo(() => {
    return makeVideoMotionFromTokens(motion);
  }, [motion]);
}
/**
 * Line weight, corner style, and tint strength for a stock shape, for
 * example to draw a preset's own 5 px corner at the theme's corner style.
 * See `VideoShapeScales`.
 */
function useGraphicShapeScales(): VideoShapeScales {
  const { stroke, corner, alpha } = useGraphicTokens();
  return useMemo(() => {
    return makeVideoShapeScalesFromSemanticTokens({ stroke, corner, alpha });
  }, [stroke, corner, alpha]);
}
/**
 * `url(#…)` for a token's SVG filter in the current graphic, or undefined
 * when the theme sets no effect for that token. For example, `Text` passes
 * `text.graphic.<role>`.
 */
function useGraphicFilter(path: string): string | undefined {
  const theme = useGraphicTheme();
  const graphicId = useContext(GraphicIdContext);
  return VideoEffectFilters.listVideoEffectFilters(theme).some(
    propEq("path", path),
  )
    ? `url(#${VideoEffectFilters.makeFilterIdFromTheme({
        graphicId,
        path,
      })})`
    : undefined;
}
/** The GraphicThemeHooks helpers and shared values. */
export const GraphicThemeHooks = {
  /**
   * The resolved theme a stock shape draws with: the surrounding theme, or
   * `classic` with no provider. Prefer `useGraphicTokens` and
   * `useGraphicProps`; use this only for whole-theme work such as effect
   * defs.
   */
  useGraphicTheme,
  /**
   * Semantic tokens for a stock shape: the surrounding theme, or `classic`
   * when the shape renders with no provider (unit tests and direct renderer
   * calls). Reads are reported like `useVideoTokens`.
   */
  useGraphicTokens,
  /**
   * A stock shape's props: its component defaults under the props it was
   * given, merged with Mantine's own `filterProps` the way `useProps` does.
   * Falls back to `classic` like `useGraphicTokens`, and reports each
   * default the shape relied on.
   */
  useGraphicProps,
  /**
   * A step of a theme's type scale in pixels, for SVG text set larger or
   * smaller than its role, for example a study heading at the `29` step.
   * Throws on a step the theme does not define.
   */
  getFontSizeFromStep: _getFontSizeFromStep,
  /**
   * A step of the surrounding theme's type scale in pixels, for a stock
   * shape that draws its own `<text>`, such as a legend value. See
   * `getFontSizeFromStep`.
   */
  useGraphicFontSize,
  /** Tempo-scaled motion for a stock shape. See `VideoMotion`. */
  useGraphicMotion,
  /**
   * Line weight, corner style, and tint strength for a stock shape, for
   * example to draw a preset's own 5 px corner at the theme's corner style.
   * See `VideoShapeScales`.
   */
  useGraphicShapeScales,
  /**
   * `url(#…)` for a token's SVG filter in the current graphic, or undefined
   * when the theme sets no effect for that token. For example, `Text`
   * passes `text.graphic.<role>`.
   */
  useGraphicFilter,
  /**
   * The SVG id of the stock graphic being drawn, so shapes can reference
   * the graphic's own `<defs>` (filters, gradients). Set by `StockGraphic`.
   */
  GraphicIdContext,
};
