import { createContext } from "react";
import type { ResolvedVideoTheme } from "../../videoTheme/videoTheme.types";
import type { ThemeDraft } from "../../videoThemeEditor/themeDraft/themeDraft";
import type { VideoThemeDraftState } from "../../videoThemeEditor/useVideoThemeDraft/useVideoThemeDraft";

/** The gallery's theme state plus what previews and exports need from it. */
export type GalleryVideoThemeValue = VideoThemeDraftState &
  Readonly<{
    /**
     * The last draft whose every part resolves; previews and exports use it.
     */
    validDraft: ThemeDraft;
    /**
     * The theme with its theme-scope draft, for gallery-wide reads such as
     * briefs.
     */
    galleryTheme: ResolvedVideoTheme;
    hasIssues: boolean;
    copyThemeJson: () => Promise<void>;
  }>;

/** The gallery theme state `GalleryVideoTheme` provides. */
export const GalleryVideoThemeContext = createContext<
  GalleryVideoThemeValue | undefined
>(undefined);
