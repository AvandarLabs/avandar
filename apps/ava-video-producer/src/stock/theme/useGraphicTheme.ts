import { filterProps } from "@mantine/core";
import { createContext, useContext, useMemo } from "react";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import {
  createVideoMotion,
  type VideoMotion,
} from "../../videoTheme/createVideoMotion/createVideoMotion";
import { makeResolvedVideoThemeFromSource } from "../../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import { SEMANTIC_TOKENS } from "../../videoTheme/tokenCatalog/semanticTokens";
import {
  createTokenUsageProxy,
  VideoTokenUsageContext,
} from "../../videoTheme/tokenUsage/tokenUsage";
import { useVideoThemeContext } from "../../videoTheme/useVideoTheme/useVideoTheme";
import {
  buildEffectFilterId,
  listVideoEffectFilters,
} from "../../videoTheme/videoEffectFilters/videoEffectFilters";
import type {
  ResolvedVideoComponents,
  ResolvedVideoSemantic,
  ResolvedVideoTheme,
  VideoComponentName,
} from "../../videoTheme/videoTheme.types";

/**
 * The SVG id of the stock graphic being drawn, so shapes can reference the
 * graphic's own `<defs>` (filters, gradients). Set by `StockGraphic`.
 */
export const GraphicIdContext = createContext("stock-graphic");

/**
 * The resolved theme a stock shape draws with: the surrounding theme, or
 * `classic` with no provider. Prefer `useGraphicTokens` and
 * `useGraphicProps`; use this only for whole-theme work such as effect defs.
 */
export function useGraphicTheme(): ResolvedVideoTheme {
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
export function useGraphicTokens(): ResolvedVideoSemantic {
  const theme = useGraphicTheme();
  const report = useContext(VideoTokenUsageContext);
  return useMemo(
    () =>
      report
        ? createTokenUsageProxy({
            value: theme.semantic,
            catalog: SEMANTIC_TOKENS,
            basePath: [],
            report,
          })
        : theme.semantic,
    [theme, report],
  );
}

/**
 * A stock shape's props: its component defaults under the props it was
 * given, merged with Mantine's own `filterProps` the way `useProps` does.
 * Falls back to `classic` like `useGraphicTokens`, and reports each default
 * the shape relied on.
 */
export function useGraphicProps<
  Name extends VideoComponentName,
  Props extends Partial<ResolvedVideoComponents[Name]>,
>(name: Name, props: Props): ResolvedVideoComponents[Name] & Props {
  const defaults = useGraphicTheme().components[name];
  const report = useContext(VideoTokenUsageContext);
  const given: Readonly<Record<string, unknown>> = filterProps(props);
  if (report) {
    for (const key of Object.keys(defaults)) {
      if (!(key in given)) {
        report(`components.${name}.${key}`);
      }
    }
  }
  return { ...defaults, ...given } as ResolvedVideoComponents[Name] & Props;
}

/** Tempo-scaled motion for a stock shape. See `VideoMotion`. */
export function useGraphicMotion(): VideoMotion {
  const { motion } = useGraphicTokens();
  return useMemo(() => createVideoMotion(motion), [motion]);
}

/**
 * `url(#…)` for a token's SVG filter in the current graphic, or undefined
 * when the theme sets no effect for that token. For example, `Text` passes
 * `text.graphic.<role>`.
 */
export function useGraphicFilter(path: string): string | undefined {
  const theme = useGraphicTheme();
  const graphicId = useContext(GraphicIdContext);
  return listVideoEffectFilters(theme).some((filter) => {
    return filter.path === path;
  })
    ? `url(#${buildEffectFilterId(graphicId, path)})`
    : undefined;
}
