import { useContext, type ReactNode } from "react";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { useVideoThemeContext } from "../../../../videoTheme/videoThemeHelpers";
import { VideoThemeProvider } from "../../../../videoTheme/VideoThemeProvider/VideoThemeProvider";

type Props = { children: ReactNode };

/**
 * Re-provides the theme in effect on an element, so the preview's CSS
 * modules read its `--video-*` variables and scene palette names.
 */
export function ThemeRoot({ children }: Readonly<Props>): ReactNode {
  const source = useVideoThemeContext()?.source ?? DEFAULT_VIDEO_THEME_SOURCE;
  return <VideoThemeProvider source={source}>{children}</VideoThemeProvider>;
}
