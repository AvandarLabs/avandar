import { useMemo, type ReactNode } from "react";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { useVideoThemeContext } from "../useVideoTheme/useVideoTheme";
import { VideoThemeProvider } from "../VideoThemeProvider/VideoThemeProvider";
import type {
  VideoThemePatch,
  VideoThemeScope as Scope,
  VideoThemeSource,
} from "../videoTheme.types";

/**
 * The source for an item nested inside another. The inner item's overrides
 * rank below the outer ones, so a composition's art direction wins over the
 * preset it contains; inner patches apply after outer patches, so explicit
 * content such as a stock `accent` prop wins over the surrounding draft.
 */
export function createScopedVideoThemeSource(
  outer: VideoThemeSource,
  inner: Scope,
): VideoThemeSource {
  return {
    library: outer.library,
    themeId: outer.themeId,
    scope: {
      overrideIds: [
        ...(inner.overrideIds ?? []),
        ...(outer.scope?.overrideIds ?? []),
      ],
      patches: [...(outer.scope?.patches ?? []), ...(inner.patches ?? [])],
    },
  };
}

const SCOPED_SOURCES = new WeakMap<
  VideoThemeSource,
  Map<string, VideoThemeSource>
>();

/**
 * `createScopedVideoThemeSource`, returning the same object for the same
 * outer source and inner scope, so resolution caches and memoized providers
 * see a stable identity across mounts and frames.
 */
export function getScopedVideoThemeSource(
  outer: VideoThemeSource,
  inner: Scope,
): VideoThemeSource {
  const key = JSON.stringify(inner);
  const byScope =
    SCOPED_SOURCES.get(outer) ?? new Map<string, VideoThemeSource>();
  SCOPED_SOURCES.set(outer, byScope);
  const cached = byScope.get(key);
  if (cached) {
    return cached;
  }
  const source = createScopedVideoThemeSource(outer, inner);
  byScope.set(key, source);
  return source;
}

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
