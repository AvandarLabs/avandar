import { DEFAULT_VIDEO_THEME_SOURCE } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { useVideoThemeContext } from "../../videoTheme/useVideoTheme";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import type { ReactNode } from "react";

/**
 * Gives a stage component a video theme to read wherever it renders. Inside
 * a provider it adds nothing. Outside one, for example the title card and
 * app chrome of a fixed composition, it provides `classic`, so
 * `useVideoTokens`, `useVideoMotion`, and `useVideoProps` never throw.
 */
export function StageThemeBoundary({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  const context = useVideoThemeContext();
  return context ? (
    children
  ) : (
    <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
      {children}
    </VideoThemeProvider>
  );
}
