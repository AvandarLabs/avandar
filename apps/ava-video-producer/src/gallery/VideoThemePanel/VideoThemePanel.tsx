import { useRef, useState } from "react";
import { reloadThenFocus } from "../../videoThemeEditor/ThemeBar/themeBarHelpers/themeBarHelpers";
import { VideoThemeEditor } from "../../videoThemeEditor/VideoThemeEditor/VideoThemeEditor";
import { useGalleryVideoTheme } from "../GalleryVideoTheme/useGalleryVideoTheme";
import { ThemePanelHeader } from "./ThemePanelHeader";
import css from "./VideoThemePanel.module.css";
import type { ThemeEditScope } from "../../videoThemeEditor/themeDraft/themeDraft";
import type { EditorItem } from "../../videoThemeEditor/VideoThemeEditor/EditorToolbar/EditorToolbar";
import type { ReactNode } from "react";

type Props = Readonly<{
  item: EditorItem;
  usedTokens: readonly string[];
}>;

/**
 * The Design tokens tab of an Atlas modal: the editor for the open item,
 * with the theme bar and the changed-on-disk banner pinned above its toolbar.
 * Key it by the item so its scope resets when the item changes.
 */
export function VideoThemePanel({ item, usedTokens }: Props): ReactNode {
  const gallery = useGalleryVideoTheme();
  const [scope, setScope] = useState<ThemeEditScope>({ kind: "theme" });
  const barRef = useRef<HTMLDivElement>(null);
  const reloadTheme = () => {
    return void reloadThenFocus({
      reload: gallery.reloadTheme,
      focus: () => {
        return barRef.current?.focus();
      },
    });
  };
  return (
    <div className={css.videoThemePanel}>
      <VideoThemeEditor
        library={gallery.library}
        themeId={gallery.themeId}
        draft={gallery.draft}
        scope={scope}
        item={item}
        usedTokens={usedTokens}
        header={
          <ThemePanelHeader
            gallery={gallery}
            barRef={barRef}
            onReloadTheme={reloadTheme}
          />
        }
        onDraftChange={gallery.setDraft}
        onScopeChange={setScope}
      />
    </div>
  );
}
