import { ChangedOnDiskBanner } from "../../videoThemeEditor/ThemeBar/ChangedOnDiskBanner/ChangedOnDiskBanner";
import { ThemeBar } from "../../videoThemeEditor/ThemeBar/ThemeBar";
import type { useGalleryVideoTheme } from "../GalleryVideoTheme/GalleryVideoTheme";
import type { RefObject } from "react";

type Props = Readonly<{
  gallery: ReturnType<typeof useGalleryVideoTheme>;
  barRef: RefObject<HTMLDivElement | null>;
  onReloadTheme: () => void;
}>;

/** The theme bar, and the changed-on-disk banner when the theme file changed under the draft. */
export function ThemePanelHeader({ gallery, barRef, onReloadTheme }: Props) {
  return (
    <>
      <ThemeBar
        themes={gallery.themes}
        themeId={gallery.themeId}
        isBuiltIn={gallery.isBuiltIn}
        isDirty={gallery.isDirty}
        hasIssues={gallery.hasIssues}
        isChangedOnDisk={gallery.isChangedOnDisk}
        status={gallery.status}
        copyStatus={gallery.copyStatus}
        onSelectTheme={gallery.selectTheme}
        onSave={() => void gallery.save()}
        onSaveAsNew={gallery.saveAsNew}
        onDiscard={gallery.discard}
        onReloadTheme={onReloadTheme}
        barRef={barRef}
        onCopyJson={() => void gallery.copyThemeJson()}
      />
      {gallery.isChangedOnDisk ? (
        <ChangedOnDiskBanner
          onKeep={gallery.keepDraft}
          onDiscard={gallery.discard}
          onReload={onReloadTheme}
        />
      ) : null}
    </>
  );
}
