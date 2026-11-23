import { makeScopedVideoThemeSourceFromScopes } from "../makeScopedVideoThemeSourceFromScopes/makeScopedVideoThemeSourceFromScopes";
import type {
  VideoThemeScope as Scope,
  VideoThemeSource,
} from "../../videoTheme.types";

const SCOPED_SOURCES = new WeakMap<
  VideoThemeSource,
  Map<string, VideoThemeSource>
>();
/**
 * `makeScopedVideoThemeSourceFromScopes`, returning the same object for the
 * same
 * outer source and inner scope, so resolution caches and memoized providers
 * see a stable identity across mounts and frames.
 */
export function getScopedVideoThemeSource({
  outer,
  inner,
}: Readonly<{
  outer: VideoThemeSource;
  inner: Scope;
}>): VideoThemeSource {
  const key = JSON.stringify(inner);
  const byScope =
    SCOPED_SOURCES.get(outer) ?? new Map<string, VideoThemeSource>();
  SCOPED_SOURCES.set(outer, byScope);
  const cached = byScope.get(key);
  if (cached) {
    return cached;
  }
  const source = makeScopedVideoThemeSourceFromScopes({
    outer,
    inner,
  });
  byScope.set(key, source);
  return source;
}
