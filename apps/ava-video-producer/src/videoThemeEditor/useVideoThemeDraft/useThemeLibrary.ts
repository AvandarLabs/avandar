import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import {
  ThemeApi,
  type StoredTheme,
  type ThemeSummary,
} from "../ThemeApi/ThemeApi";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../../videoTheme/videoTheme.types";

type ThemeCollection = Readonly<{
  themes: readonly ThemeSummary[];
  stored: ReadonlyMap<string, StoredTheme>;
}>;

/** Themes the editor knows, their files' hashes, and a library to resolve them. */
export type ThemeLibraryState = ThemeCollection &
  Readonly<{
    library: VideoThemeLibrary;
    storeTheme: (stored: StoredTheme) => void;
  }>;

function _summaryFromDocument(document: VideoThemeDocument): ThemeSummary {
  return {
    id: document.id,
    label: document.label,
    builtIn: BUILT_IN_VIDEO_THEMES.has(document.id),
    ...(document.extends ? { extends: document.extends } : {}),
  };
}

const BUILT_IN_COLLECTION: ThemeCollection = {
  themes: [...BUILT_IN_VIDEO_THEMES.values()].map(_summaryFromDocument),
  stored: new Map(),
};

/**
 * Starts with the bundled built-in themes and adds every theme the showcase
 * serves once `/api/themes` answers. Without the server, built-ins stay
 * available and saving is off (no stored hashes).
 */
export function useThemeLibrary(): ThemeLibraryState {
  const [collection, setCollection] =
    useState<ThemeCollection>(BUILT_IN_COLLECTION);
  useEffect(function loadThemeCollectionFromApi() {
    let isCurrent = true;
    ThemeApi.loadAll().then(
      (loaded) => {
        if (isCurrent) {
          setCollection(loaded);
        }
      },
      () => {
        // Without the showcase API the built-in themes stay available.
      },
    );
    return () => {
      isCurrent = false;
    };
  }, []);
  const library = useMemo(
    () =>
      createVideoThemeLibrary(
        [...collection.stored.values()].map((entry) => entry.document),
      ),
    [collection.stored],
  );
  const storeTheme = useCallback(
    (stored: StoredTheme) =>
      setCollection((current) => ({
        themes: current.themes.some((theme) => theme.id === stored.document.id)
          ? current.themes
          : [...current.themes, _summaryFromDocument(stored.document)],
        stored: new Map([...current.stored, [stored.document.id, stored]]),
      })),
    [],
  );
  return { ...collection, library, storeTheme };
}
