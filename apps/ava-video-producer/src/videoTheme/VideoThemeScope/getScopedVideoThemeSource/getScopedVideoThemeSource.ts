import { createScopedVideoThemeSource } from "../createScopedVideoThemeSource/createScopedVideoThemeSource";
import type {
  VideoThemeScope as Scope,
  VideoThemeSource,
} from "../../videoTheme.types";

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
