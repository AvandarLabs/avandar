import { MantineThemeProvider } from "@mantine/core";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { buildVideoCssVariables } from "../buildVideoCssVariables/buildVideoCssVariables";
import { resolveVideoThemeFromSource } from "../resolveVideoThemeFromSource/resolveVideoThemeFromSource";
import { VideoThemeContext } from "../useVideoTheme/useVideoTheme";
import type { ResolvedVideoTheme, VideoThemeSource } from "../videoTheme.types";

type Props = Readonly<{
  source: VideoThemeSource;
  children: ReactNode;
  /** `none` renders no wrapper, for use inside an SVG; CSS variables are then unset. */
  element?: "div" | "none";
}>;

const CSS_STYLES = new WeakMap<ResolvedVideoTheme, CSSProperties>();

function _styleFromTheme(theme: ResolvedVideoTheme): CSSProperties {
  const cached = CSS_STYLES.get(theme);
  if (cached) {
    return cached;
  }
  const style: CSSProperties = {
    display: "contents",
    ...buildVideoCssVariables(theme),
  };
  CSS_STYLES.set(theme, style);
  return style;
}

/**
 * Resolves a video theme and makes it the theme of everything inside:
 * Mantine `useProps` defaults for themed shapes, `useVideoTokens` reads,
 * and `--video-*` CSS variables on a `display: contents` wrapper for CSS
 * modules. The Mantine theme does not inherit the page's, so gallery
 * chrome and video theme never style each other. Use it at the root of a
 * film or a gallery preview.
 */
export function VideoThemeProvider({
  source,
  children,
  element = "div",
}: Props) {
  const theme = useMemo(() => resolveVideoThemeFromSource(source), [source]);
  const value = useMemo(() => ({ theme, source }), [theme, source]);
  const style = _styleFromTheme(theme);
  const content = (
    <MantineThemeProvider theme={theme.mantine} inherit={false}>
      <VideoThemeContext.Provider value={value}>
        {children}
      </VideoThemeContext.Provider>
    </MantineThemeProvider>
  );
  return element === "none" ? content : <div style={style}>{content}</div>;
}
