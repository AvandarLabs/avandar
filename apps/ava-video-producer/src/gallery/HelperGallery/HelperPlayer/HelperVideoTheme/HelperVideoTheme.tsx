import { useContext, type ReactNode } from "react";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { useVideoThemeContext } from "../../../../videoTheme/videoThemeHelpers";
import { VideoThemeProvider } from "../../../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { VideoThemeSnapshots } from "../../../../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import { GalleryItemTheme } from "../../../GalleryVideoTheme/GalleryItemTheme";
import { GalleryVideoThemeContext } from "../../../GalleryVideoTheme/GalleryVideoThemeContext";
import { ThemeRoot } from "./ThemeRoot";
import type { VideoThemeSnapshot } from "../../../../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";

type Props = Readonly<{
  helperId: string;
  /** The film's theme, when the live player was given one. */
  theme?: VideoThemeSnapshot;
  children: ReactNode;
}>;
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
        source={VideoThemeSnapshots.toSource({
          snapshot: theme,
          overrideIds: [helperId],
        })}
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
