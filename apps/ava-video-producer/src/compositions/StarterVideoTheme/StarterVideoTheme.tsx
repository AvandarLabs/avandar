import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { createStarterVideoThemeSource } from "./createStarterVideoThemeSource";
import type { ReactNode } from "react";

/**
 * Draws a fixed composition in the `starter` theme. Use it at the root of a
 * Remotion composition that renders `Demo`, `MotionLab`, or `TitleStudy`
 * outside a showcase film, which brings its own theme.
 */
export function StarterVideoTheme({
  itemId,
  children,
}: Readonly<{ itemId: string; children: ReactNode }>): ReactNode {
  return (
    <VideoThemeProvider source={createStarterVideoThemeSource(itemId)}>
      {children}
    </VideoThemeProvider>
  );
}
