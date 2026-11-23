import { useMemo, type ReactNode } from "react";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { useVideoThemeContext } from "../useVideoTheme";
import { VideoThemeProvider } from "../VideoThemeProvider/VideoThemeProvider";
import { getScopedVideoThemeSource } from "./getScopedVideoThemeSource/getScopedVideoThemeSource";
import type { VideoThemePatch } from "../videoTheme.types";

type Props = Readonly<{
  overrideIds?: readonly string[];
  patches?: readonly VideoThemePatch[];
  children: ReactNode;
  element?: "div" | "none";
}>;

/**
 * Re-themes a subtree for one item: the surrounding theme plus that item's
 * overrides and patches. Outside any provider it starts from `classic`, so
 * a stock graphic rendered on its own still draws with tokens. Use it
 * around a nested preset or a gallery card.
 */
export function VideoThemeScope({
  overrideIds,
  patches,
  children,
  element = "none",
}: Props) {
  const outer = useVideoThemeContext()?.source ?? DEFAULT_VIDEO_THEME_SOURCE;
  // Callers rebuild these arrays on every frame; the key keeps the source stable.
  const scopeKey = JSON.stringify({ overrideIds, patches });
  const source = useMemo(
    () => getScopedVideoThemeSource(outer, JSON.parse(scopeKey)),
    [outer, scopeKey],
  );
  return (
    <VideoThemeProvider source={source} element={element}>
      {children}
    </VideoThemeProvider>
  );
}
