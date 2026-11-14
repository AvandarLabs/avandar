import { useState } from "react";
import { ChangedOnDiskBanner } from "../../videoThemeEditor/ThemeBar/ChangedOnDiskBanner";
import { ThemeBar } from "../../videoThemeEditor/ThemeBar/ThemeBar";
import { VideoThemeEditor } from "../../videoThemeEditor/VideoThemeEditor/VideoThemeEditor";
import { useGalleryVideoTheme } from "../GalleryVideoTheme/GalleryVideoTheme";
import css from "./VideoThemePanel.module.css";
import type { ThemeEditScope } from "../../videoThemeEditor/themeDraft/themeDraft";
import type { EditorItem } from "../../videoThemeEditor/VideoThemeEditor/EditorToolbar";

type Props = Readonly<{
  item: EditorItem;
  usedTokens: readonly string[];
}>;

/**
 * The Design tokens tab of an Atlas modal: the editor for the open item,
 * with the theme bar and the changed-on-disk banner pinned above its toolbar.
 * Key it by the item so its scope resets when the item changes.
 */
export function VideoThemePanel({ item, usedTokens }: Props) {
  const gallery = useGalleryVideoTheme();
  const [scope, setScope] = useState<ThemeEditScope>({ kind: "theme" });
  return (
    <div className={css.panel}>
      <VideoThemeEditor
        library={gallery.library}
        themeId={gallery.themeId}
        draft={gallery.draft}
        scope={scope}
        item={item}
        usedTokens={usedTokens}
        header={
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
          </>
        }
        onDraftChange={gallery.setDraft}
        onScopeChange={setScope}
      />
    </div>
  );
}
