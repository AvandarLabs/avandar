import { useMemo, type RefObject } from "react";
import {
  AtlasPanelTabs,
  type AtlasPanelTab,
} from "../../../../gallery/AtlasLayout/AtlasPanelTabs/AtlasPanelTabs";
import { useGalleryVideoTheme } from "../../../../gallery/GalleryVideoTheme/GalleryVideoTheme";
import { VideoThemePanel } from "../../../../gallery/VideoThemePanel/VideoThemePanel";
import {
  createExportThemeFromDraft,
  createSnapshotFromDraft,
} from "../../../../videoThemeEditor/themeDraft/themeDraft";
import { isSceneEntry } from "../../../continuityCatalog";
import { useCompositionTheme } from "../useCompositionTheme";
import { CompositionSettingsDetails } from "./CompositionSettingsDetails";
import type { ContinuityCatalogEntry } from "../../../continuityCatalog";
import type { useCompositionAppearance } from "../useCompositionAppearance";

type Props = Readonly<{
  selected: ContinuityCatalogEntry;
  captions: boolean | undefined;
  player: RefObject<HTMLIFrameElement | null>;
  appearance: ReturnType<typeof useCompositionAppearance>;
  tab: AtlasPanelTab;
  onTabChange: (tab: AtlasPanelTab) => void;
}>;

/** The draft's theme for one composition: what its player shows and what its export sends. */
function useCompositionDraftTheme(
  selected: ContinuityCatalogEntry,
  player: RefObject<HTMLIFrameElement | null>,
) {
  const { library, themeId, validDraft, hasIssues } = useGalleryVideoTheme();
  const isScene = isSceneEntry(selected);
  const snapshot = useMemo(() => {
    return isScene
      ? undefined
      : createSnapshotFromDraft({
          library,
          themeId,
          draft: validDraft,
          itemId: selected.id,
        });
  }, [isScene, library, themeId, validDraft, selected.id]);
  const exportTheme = useMemo(() => {
    return createExportThemeFromDraft({
      library,
      themeId,
      draft: validDraft,
      itemId: selected.id,
    });
  }, [library, themeId, validDraft, selected.id]);
  const theme = useCompositionTheme({
    id: selected.id,
    player,
    snapshot,
    isScene,
    hasDraftIssues: hasIssues,
  });
  return { isScene, exportTheme, theme };
}

/** The settings column: appearance and downloads, plus the design tokens for the composition. */
export function CompositionSettings({
  selected,
  captions,
  player,
  appearance,
  tab,
  onTabChange,
}: Props) {
  const { isScene, exportTheme, theme } = useCompositionDraftTheme(
    selected,
    player,
  );
  const tokens = isScene ? undefined : (
    <VideoThemePanel
      key={selected.id}
      item={{
        id: selected.id,
        scopeLabel: "This composition only",
        name: "This composition",
      }}
      usedTokens={theme.usedTokens}
    />
  );
  return (
    <AtlasPanelTabs
      tab={tab}
      onTabChange={onTabChange}
      details={
        <CompositionSettingsDetails
          id={selected.id}
          captions={captions}
          appearance={appearance}
          isScene={isScene}
          exportTheme={exportTheme}
          theme={theme}
        />
      }
      tokens={tokens}
    />
  );
}
