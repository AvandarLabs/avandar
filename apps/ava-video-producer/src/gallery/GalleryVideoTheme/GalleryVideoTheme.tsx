import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { makeResolvedVideoThemeFromLibrary } from "../../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { VideoThemeContext } from "../../videoTheme/useVideoTheme";
import { buildThemeJsonFromDraft } from "../../videoThemeEditor/buildThemeJsonFromDraft/buildThemeJsonFromDraft";
import { useDraftTheme } from "../../videoThemeEditor/resolveDraftTheme/useDraftTheme";
import { useValidThemeDraft } from "../../videoThemeEditor/resolveDraftTheme/useValidThemeDraft";
import {
  useVideoThemeDraft,
  type VideoThemeDraftState,
} from "../../videoThemeEditor/useVideoThemeDraft/useVideoThemeDraft";
import { copyTextToClipboard } from "../copyText";
import type { ResolvedVideoTheme } from "../../videoTheme/videoTheme.types";
import type { ThemeDraft } from "../../videoThemeEditor/themeDraft/themeDraft";

/** The gallery's theme state plus what previews and exports need from it. */
export type GalleryVideoThemeValue = VideoThemeDraftState &
  Readonly<{
    /** The last draft whose every part resolves; previews and exports use it. */
    validDraft: ThemeDraft;
    /** The theme with its theme-scope draft, for gallery-wide reads such as briefs. */
    galleryTheme: ResolvedVideoTheme;
    hasIssues: boolean;
    copyThemeJson: () => Promise<void>;
  }>;

const GalleryVideoThemeContext = createContext<
  GalleryVideoThemeValue | undefined
>(undefined);
const THEME_SCOPE = { kind: "theme" } as const;

/** The gallery theme state. Throws outside `GalleryVideoTheme`. */
export function useGalleryVideoTheme(): GalleryVideoThemeValue {
  const value = useContext(GalleryVideoThemeContext);
  if (!value) {
    throw new Error(
      "Gallery theme state needs a GalleryVideoTheme above this component",
    );
  }
  return value;
}

/** Copies the active theme and its draft as the JSON a save would write. */
function useCopyThemeJson(state: VideoThemeDraftState): () => Promise<void> {
  const { library, themeId, draft, setCopyStatus } = state;
  return useCallback(async () => {
    const json = buildThemeJsonFromDraft({ library, themeId, draft });
    if (json === undefined) {
      return;
    }
    try {
      await copyTextToClipboard(json, "Theme JSON");
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }, [library, themeId, draft, setCopyStatus]);
}

/**
 * Owns the one theme draft every Atlas modal edits, and makes the saved
 * active theme the ambient video theme source. It sets no Mantine theme:
 * each preview gets its own `GalleryItemTheme`, so the gallery chrome never
 * picks up video tokens. Wrap the Motions, Compositions, and Sample films
 * sections in it. Its value keeps its identity until the draft state or
 * the resolved draft changes, so consumers skip unrelated renders.
 */
export function GalleryVideoTheme({
  children,
}: Readonly<{ children: ReactNode }>) {
  const state = useVideoThemeDraft();
  const { library, themeId, draft } = state;
  const draftTheme = useDraftTheme({
    library,
    themeId,
    draft,
    scope: THEME_SCOPE,
  });
  const valid = useValidThemeDraft({ library, themeId, draft });
  const copyThemeJson = useCopyThemeJson(state);
  const savedTheme = useMemo(() => {
    return makeResolvedVideoThemeFromLibrary(library, themeId);
  }, [library, themeId]);
  const videoContext = useMemo(() => {
    return { theme: savedTheme, source: { library, themeId } };
  }, [savedTheme, library, themeId]);
  const value = useMemo<GalleryVideoThemeValue>(() => {
    return {
      ...state,
      validDraft: valid.draft,
      galleryTheme: draftTheme.theme,
      hasIssues: !valid.isValid,
      copyThemeJson,
    };
  }, [state, valid.draft, valid.isValid, draftTheme.theme, copyThemeJson]);
  return (
    <GalleryVideoThemeContext.Provider value={value}>
      <VideoThemeContext.Provider value={videoContext}>
        {children}
      </VideoThemeContext.Provider>
    </GalleryVideoThemeContext.Provider>
  );
}
