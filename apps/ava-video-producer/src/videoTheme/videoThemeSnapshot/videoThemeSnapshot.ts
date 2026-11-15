import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromSource } from "../makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import { getExtendsChainFromThemeId } from "../mergeVideoThemeLayers/mergeVideoThemeLayers";
import type {
  ResolvedVideoTheme,
  VideoThemeDocument,
  VideoThemeLibrary,
  VideoThemePatch,
  VideoThemeSource,
} from "../videoTheme.types";

/**
 * Everything a render needs to resolve a theme without reading `themes/`:
 * the theme id, the custom documents it depends on (its `extends` chain
 * without built-ins, which every bundle carries), and unsaved draft patches,
 * lowest precedence first (the theme-scope draft, then the item override
 * draft). Frozen into a `Film` and posted to the live player.
 */
export type VideoThemeSnapshot = Readonly<{
  themeId: string;
  documents: readonly VideoThemeDocument[];
  patches: readonly VideoThemePatch[];
}>;

/** The built-in default: `classic` with no drafts. */
export const CLASSIC_VIDEO_THEME_SNAPSHOT: VideoThemeSnapshot = {
  themeId: "classic",
  documents: [],
  patches: [],
};

/**
 * A snapshot of one theme from a library, for example the themes read from
 * `themes/` on the showcase server, with optional draft patches.
 */
export function createVideoThemeSnapshot(
  library: VideoThemeLibrary,
  themeId: string,
  patches: readonly VideoThemePatch[] = [],
): VideoThemeSnapshot {
  const documents = getExtendsChainFromThemeId(library, themeId).filter(
    (document) => !BUILT_IN_VIDEO_THEMES.has(document.id),
  );
  return { themeId, documents, patches };
}

/** A snapshot with more draft patches applied after its own. */
export function addPatchesToVideoThemeSnapshot(
  snapshot: VideoThemeSnapshot,
  patches: readonly VideoThemePatch[],
): VideoThemeSnapshot {
  return patches.length === 0
    ? snapshot
    : { ...snapshot, patches: [...snapshot.patches, ...patches] };
}

const SOURCES = new WeakMap<
  VideoThemeSnapshot,
  Map<string, VideoThemeSource>
>();

/**
 * The theme source for one item rendered from a snapshot: the snapshot's
 * theme with that item's overrides and the snapshot's drafts. Returns the
 * same object for the same snapshot and ids. An undefined snapshot is
 * `classic`, so films saved before themes existed still render.
 */
export function createVideoThemeSourceFromSnapshot(
  snapshot: VideoThemeSnapshot | undefined,
  overrideIds: readonly string[],
): VideoThemeSource {
  const value = snapshot ?? CLASSIC_VIDEO_THEME_SNAPSHOT;
  const key = JSON.stringify(overrideIds);
  const byIds = SOURCES.get(value) ?? new Map<string, VideoThemeSource>();
  SOURCES.set(value, byIds);
  const cached = byIds.get(key);
  if (cached) {
    return cached;
  }
  const source: VideoThemeSource = {
    library: createVideoThemeLibrary(value.documents),
    themeId: value.themeId,
    scope: { overrideIds: [...overrideIds], patches: value.patches },
  };
  byIds.set(key, source);
  return source;
}

/** The resolved theme of one item rendered from a snapshot. */
export function makeResolvedVideoThemeFromSnapshot(
  snapshot: VideoThemeSnapshot | undefined,
  overrideIds: readonly string[],
): ResolvedVideoTheme {
  return makeResolvedVideoThemeFromSource(
    createVideoThemeSourceFromSnapshot(snapshot, overrideIds),
  );
}
