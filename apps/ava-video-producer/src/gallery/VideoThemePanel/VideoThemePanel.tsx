import { useState } from "react";
import { ChangedOnDiskBanner } from "../../videoThemeEditor/ThemeBar/ChangedOnDiskBanner";
import { ThemeBar } from "../../videoThemeEditor/ThemeBar/ThemeBar";
import { VideoThemeEditor } from "../../videoThemeEditor/VideoThemeEditor/VideoThemeEditor";
import { useGalleryVideoTheme } from "../GalleryVideoTheme/GalleryVideoTheme";
import css from "./VideoThemePanel.module.css";
import type { ThemeEditScope } from "../../videoThemeEditor/themeDraft/themeDraft";

type Props = Readonly<{
  item: Readonly<{ id: string; scopeLabel: string }>;
  usedTokens: readonly string[];
}>;

/**
 * The Design tokens tab of an Atlas modal: the theme bar, the
 * changed-on-disk banner, and the editor for the open item. Key it by the
 * item so its scope resets when the item changes.
 */
export function VideoThemePanel({ item, usedTokens }: Props) {
  const gallery = useGalleryVideoTheme();
  const [scope, setScope] = useState<ThemeEditScope>({ kind: "theme" });
  return (
    <div className={css.panel}>
      <ThemeBar
        themes={gallery.themes}
        themeId={gallery.themeId}
        isBuiltIn={gallery.isBuiltIn}
        isDirty={gallery.isDirty}
        hasIssues={gallery.hasIssues}
        isChangedOnDisk={gallery.isChangedOnDisk}
        status={gallery.status}
        onSelectTheme={gallery.selectTheme}
        onSave={() => void gallery.save()}
        onSaveAsNew={gallery.saveAsNew}
        onDiscard={gallery.discard}
        onReloadTheme={() => void gallery.reloadTheme()}
        onCopyJson={() => void gallery.copyThemeJson()}
      />
      {gallery.isChangedOnDisk ? (
        <ChangedOnDiskBanner
          onKeep={gallery.keepDraft}
          onDiscard={gallery.discard}
          onReload={() => void gallery.reloadTheme()}
        />
      ) : null}
      <VideoThemeEditor
        library={gallery.library}
        themeId={gallery.themeId}
        draft={gallery.draft}
        scope={scope}
        item={item}
        usedTokens={usedTokens}
        onDraftChange={gallery.setDraft}
        onScopeChange={setScope}
      />
    </div>
  );
}
