import { useMemo } from "react";
import { DraftThemeResolution } from "../../../videoThemeEditor/DraftThemeResolution/DraftThemeResolution";
import { useGalleryVideoTheme } from "../../GalleryVideoTheme/useGalleryVideoTheme";
import { AtlasSections } from "../AtlasSections/AtlasSections";
import { GalleryHeader } from "../GalleryHeader";
import { MotionLibraryPreview } from "../MotionLibraryPreview/MotionLibraryPreview";
import { MotionNotice } from "../MotionNotice/MotionNotice";
import { MotionWorkspace } from "../MotionWorkspace/MotionWorkspace";
import { ReferenceTray } from "../ReferenceTray";
import { useMotionGalleryState } from "../useMotionGalleryState/useMotionGalleryState";
import css from "./MotionLibrary.module.css";
import type { ReactNode } from "react";

/**
 * The accent and ground one motion's preview shows: the theme draft, the
 * motion's saved overrides, and its own draft. With no motion open it
 * resolves nothing. It returns undefined then, or while the draft does not
 * resolve, and the caller falls back to the theme-scope colors.
 */
function useItemThemeColors(
  itemId: string | undefined,
): { accent: string; background: string } | undefined {
  const { library, themeId, draft } = useGalleryVideoTheme();
  return useMemo(() => {
    if (!itemId) {
      return undefined;
    }
    const result = DraftThemeResolution.makeDraftThemeResultFromDraft({
      library,
      themeId,
      draft,
      scope: { kind: "item", itemId },
    });
    return result.ok
      ? {
          accent: result.theme.semantic.color.accent,
          background: result.theme.semantic.color.ground,
        }
      : undefined;
  }, [library, themeId, draft, itemId]);
}

/**
 * Root of the Motion Atlas showcase: browses, previews, and exports stock
 * motion presets.
 */
export function MotionLibrary(): ReactNode {
  const state = useMotionGalleryState();
  const { saved, setSaved, selected, savedPresets, onCopy, notice } = state;
  const savedIds = useMemo(() => {
    return new Set(saved);
  }, [saved]);
  const { galleryTheme } = useGalleryVideoTheme();
  const accent = galleryTheme.semantic.color.accent;
  const background = galleryTheme.semantic.color.ground;
  const selectedColors = useItemThemeColors(selected?.id);

  return (
    <>
      <a className={css.motionLibrarySkipLink} href="#library">
        Skip to motion library
      </a>
      <GalleryHeader />
      <AtlasSections section="motions" />
      <MotionWorkspace {...{ state, savedIds }} />
      {saved.length > 0 ? (
        <ReferenceTray
          saved={saved}
          setSaved={setSaved}
          savedPresets={savedPresets}
          accent={accent}
          background={background}
          onCopy={onCopy}
        />
      ) : null}
      <MotionNotice {...{ notice, selected }} />
      <MotionLibraryPreview
        {...{ state, accent, background, selectedColors }}
      />
    </>
  );
}
