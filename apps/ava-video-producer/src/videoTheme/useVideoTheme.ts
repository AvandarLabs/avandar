import { useProps } from "@mantine/core";
import { createContext, useContext, useMemo } from "react";
import { SEMANTIC_TOKENS } from "./tokenCatalog/semanticTokens/semanticTokens";
import {
  createTokenUsageProxy,
  VideoTokenUsageContext,
} from "./tokenUsageHelpers/tokenUsageHelpers";
import type {
  ResolvedVideoComponents,
  ResolvedVideoSemantic,
  ResolvedVideoTheme,
  VideoComponentName,
  VideoThemeSource,
} from "./videoTheme.types";

/** The resolved theme in effect and the source it was resolved from. */
export type VideoThemeContextValue = Readonly<{
  theme: ResolvedVideoTheme;
  source: VideoThemeSource;
}>;

/**
 * The video theme of the subtree. Set by `VideoThemeProvider`. The source is
 * kept so a nested `VideoThemeScope` can re-resolve with extra overrides.
 */
export const VideoThemeContext = createContext<
  VideoThemeContextValue | undefined
>(undefined);

/** The theme context, or undefined outside any provider. */
export function useVideoThemeContext(): VideoThemeContextValue | undefined {
  return useContext(VideoThemeContext);
}

/**
 * The resolved video theme. Throws outside a provider, so a themed shape
 * can never silently read the gallery chrome's Mantine theme instead.
 */
export function useVideoTheme(): ResolvedVideoTheme {
  const value = useContext(VideoThemeContext);
  if (!value) {
    throw new Error(
      "Video tokens need a VideoThemeProvider or VideoThemeScope above this component",
    );
  }
  return value.theme;
}

/**
 * Typed semantic tokens, such as `color.accent` or `text.graphic.caption`.
 * Reads are reported to `VideoTokenUsageContext` when one is set. Use it in
 * preset-specific shapes that are not themed components.
 */
export function useVideoTokens(): ResolvedVideoSemantic {
  const theme = useVideoTheme();
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
 * A themed shape's props: its theme `defaultProps` (through Mantine
 * `useProps`) under the props it was given. Reports each default it relied
 * on, such as `components.ProgressBar.height`. Use it at the top of every
 * themed component.
 */
export function useVideoProps<
  Name extends VideoComponentName,
  Props extends Partial<ResolvedVideoComponents[Name]>,
>(name: Name, props: Props): ResolvedVideoComponents[Name] & Props {
  const theme = useVideoTheme();
  const report = useContext(VideoTokenUsageContext);
  const merged = useProps(name, {}, props);
  if (report) {
    const given: Readonly<Record<string, unknown>> = props;
    Object.keys(theme.components[name])
      .filter((key) => given[key] === undefined)
      .forEach((key) => report(`components.${name}.${key}`));
  }
  return merged as ResolvedVideoComponents[Name] & Props;
}
