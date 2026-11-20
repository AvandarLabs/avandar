import { useContext, type ReactNode } from "react";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { useVideoThemeContext } from "../../../../videoTheme/useVideoTheme";
import { VideoThemeProvider } from "../../../../videoTheme/VideoThemeProvider/VideoThemeProvider";
/**
 * Re-provides the theme in effect on an element, so the preview's CSS
 * modules read its `--video-*` variables and scene palette names.
 */
export function ThemeRoot({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  const source = useVideoThemeContext()?.source ?? DEFAULT_VIDEO_THEME_SOURCE;
  return <VideoThemeProvider source={source}>{children}</VideoThemeProvider>;
}
