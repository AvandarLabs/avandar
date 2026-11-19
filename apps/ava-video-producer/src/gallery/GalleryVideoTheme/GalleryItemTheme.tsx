import { useDeferredValue, useMemo, type ReactNode } from "react";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import {
  createVideoThemeSourceFromDraft,
  isThemeDraftEmpty,
} from "../../videoThemeEditor/themeDraft/themeDraft";
import { useGalleryVideoTheme } from "./GalleryVideoTheme";
import type { VideoThemeSource } from "../../videoTheme/videoTheme.types";

/**
 * Renders one live preview with the gallery draft, resolved as saving would
 * produce it (see `createDraftThemeTarget`): the draft target's theme plus
 * the item's draft patches. The previewed renderer still adds the item's
 * own override id, as it does without a draft. With no edits it adds
 * nothing and the preview uses the saved theme. Wrap each live preview in
 * it, never the gallery chrome.
 */
export function GalleryItemTheme({
  itemId,
  children,
}: Readonly<{ itemId: string; children: ReactNode }>) {
  const { library, themeId, validDraft } = useGalleryVideoTheme();
  const themeInputs = useMemo(() => {
    return { library, themeId, draft: validDraft };
  }, [library, themeId, validDraft]);
  // Thumbnails trail the modal by one deferred render so typing stays fast.
  const deferredThemeInputs = useDeferredValue(themeInputs);
  // Providers resolve each source object once, so the source is memoized.
  const source = useMemo<VideoThemeSource>(() => {
    const draftSource = createVideoThemeSourceFromDraft({
      ...deferredThemeInputs,
      itemId,
    });
    return {
      library: draftSource.library,
      themeId: draftSource.themeId,
      scope: { patches: draftSource.scope?.patches ?? [] },
    };
  }, [deferredThemeInputs, itemId]);
  if (isThemeDraftEmpty(deferredThemeInputs.draft)) {
    return children;
  }
  return (
    <VideoThemeProvider source={source} element="none">
      {children}
    </VideoThemeProvider>
  );
}
