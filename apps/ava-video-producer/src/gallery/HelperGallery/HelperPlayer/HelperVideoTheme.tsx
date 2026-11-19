import { useContext, type ReactNode } from "react";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { useVideoThemeContext } from "../../../videoTheme/useVideoTheme";
import { VideoThemeProvider } from "../../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { createVideoThemeSourceFromSnapshot } from "../../../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import { GalleryItemTheme } from "../../GalleryVideoTheme/GalleryItemTheme";
import { GalleryVideoThemeContext } from "../../GalleryVideoTheme/GalleryVideoThemeContext";
import type { VideoThemeSnapshot } from "../../../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";

type Props = Readonly<{
  helperId: string;
  /** The film's theme, when the live player was given one. */
  theme?: VideoThemeSnapshot;
  children: ReactNode;
}>;

/**
 * Re-provides the theme in effect on an element, so the preview's CSS
 * modules read its `--video-*` variables and scene palette names.
 */
function ThemeRoot({ children }: Readonly<{ children: ReactNode }>) {
  const source = useVideoThemeContext()?.source ?? DEFAULT_VIDEO_THEME_SOURCE;
  return <VideoThemeProvider source={source}>{children}</VideoThemeProvider>;
}

/**
 * The video theme a helper preview draws in: the film's theme in the live
 * player, the gallery's saved theme and draft inside the Atlas (through
 * `GalleryItemTheme`), and `classic` anywhere else.
 */
export function HelperVideoTheme({
  helperId,
  theme,
  children,
}: Props): ReactNode {
  const gallery = useContext(GalleryVideoThemeContext);
  if (theme) {
    return (
      <VideoThemeProvider
        source={createVideoThemeSourceFromSnapshot(theme, [helperId])}
      >
        {children}
      </VideoThemeProvider>
    );
  }
  return gallery ? (
    <GalleryItemTheme itemId={helperId}>
      <ThemeRoot>{children}</ThemeRoot>
    </GalleryItemTheme>
  ) : (
    <ThemeRoot>{children}</ThemeRoot>
  );
}
