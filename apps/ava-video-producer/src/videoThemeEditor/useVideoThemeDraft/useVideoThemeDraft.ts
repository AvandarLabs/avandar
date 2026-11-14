import { useMemo } from "react";
import { BUILT_IN_VIDEO_THEME_IDS } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { getBrowserStorage } from "./browserStorage";
import { useActiveThemeId } from "./useActiveThemeId";
import { useStoredDraft, type StoredDraftState } from "./useStoredDraft";
import { useThemeLibrary } from "./useThemeLibrary";
import { useThemeSaving, type ThemeSavingState } from "./useThemeSaving";
import type { VideoThemeLibrary } from "../../videoTheme/videoTheme.types";
import type { ThemeSummary } from "../ThemeApi/ThemeApi";

/** Everything a theme editor host needs: themes, the active theme, its draft, and saving. */
export type VideoThemeDraftState = StoredDraftState &
  ThemeSavingState &
  Readonly<{
    themes: readonly ThemeSummary[];
    themeId: string;
    selectTheme: (themeId: string) => void;
    library: VideoThemeLibrary;
    isBuiltIn: boolean;
  }>;

/**
 * The theme list, the active theme (from `?theme=` or the viewer's last
 * choice), its unsaved draft (surviving reloads), and save actions. Call it
 * once per page and share the result with every modal, for example through
 * the gallery's theme context.
 */
export function useVideoThemeDraft(): VideoThemeDraftState {
  const storage = useMemo(getBrowserStorage, []);
  const { themes, stored, library, storeTheme } = useThemeLibrary();
  const [themeId, selectTheme] = useActiveThemeId({ library, storage });
  const storedTheme = stored.get(themeId);
  const draftState = useStoredDraft({
    themeId,
    baseHash: storedTheme?.hash ?? "",
    storage,
  });
  const isBuiltIn = (BUILT_IN_VIDEO_THEME_IDS as readonly string[]).includes(
    themeId,
  );
  const saving = useThemeSaving({
    library,
    themeId,
    isBuiltIn,
    storedTheme,
    draft: draftState.draft,
    storeTheme,
    selectTheme,
    discard: draftState.discard,
  });
  return {
    themes,
    themeId,
    selectTheme,
    library,
    isBuiltIn,
    ...draftState,
    ...saving,
  };
}
