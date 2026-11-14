import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useMemo, useRef, useState, type RefObject } from "react";
import {
  AtlasPanelTabs,
  type AtlasPanelTab,
} from "../../../gallery/AtlasLayout/AtlasPanelTabs/AtlasPanelTabs";
import { useGalleryVideoTheme } from "../../../gallery/GalleryVideoTheme/GalleryVideoTheme";
import { VideoThemePanel } from "../../../gallery/VideoThemePanel/VideoThemePanel";
import {
  createExportThemeFromDraft,
  createSnapshotFromDraft,
} from "../../../videoThemeEditor/themeDraft/themeDraft";
import { isSceneEntry } from "../../continuityCatalog";
import { useContinuityCopy } from "../../useContinuityCopy";
import { CompositionActions } from "./CompositionActions/CompositionActions";
import { CompositionControls } from "./CompositionControls";
import { CompositionSummary } from "./CompositionSummary";
import css from "./CompositionViewer.module.css";
import { useCompositionAppearance } from "./useCompositionAppearance";
import { useCompositionPlayer } from "./useCompositionPlayer";
import { useCompositionTheme } from "./useCompositionTheme";
import { VocabularyGuide } from "./VocabularyGuide/VocabularyGuide";
import type { ContinuityCatalogEntry } from "../../continuityCatalog";

type Props = {
  selected: ContinuityCatalogEntry;
  captions: boolean | undefined;
  onOptions: (options: { id: string; captions: boolean }) => void;
};

type SettingsProps = Readonly<{
  selected: ContinuityCatalogEntry;
  captions: boolean | undefined;
  player: RefObject<HTMLIFrameElement | null>;
  appearance: ReturnType<typeof useCompositionAppearance>;
  tab: AtlasPanelTab;
  onTabChange: (tab: AtlasPanelTab) => void;
}>;

function CompositionSettings({
  selected,
  captions,
  player,
  appearance,
  tab,
  onTabChange,
}: SettingsProps) {
  const { t } = useLingui();
  const { library, themeId, validDraft, hasIssues } = useGalleryVideoTheme();
  const isScene = isSceneEntry(selected);
  const snapshot = useMemo(
    () =>
      isScene
        ? undefined
        : createSnapshotFromDraft({
            library,
            themeId,
            draft: validDraft,
            itemId: selected.id,
          }),
    [isScene, library, themeId, validDraft, selected.id],
  );
  const exportTheme = useMemo(
    () =>
      createExportThemeFromDraft({
        library,
        themeId,
        draft: validDraft,
        itemId: selected.id,
      }),
    [library, themeId, validDraft, selected.id],
  );
  const theme = useCompositionTheme({ id: selected.id, player, snapshot });
  return (
    <AtlasPanelTabs
      tab={tab}
      onTabChange={onTabChange}
      details={
        <>
          <CompositionControls appearance={appearance} isScene={isScene} />
          <CompositionActions
            id={selected.id}
            captions={captions}
            options={appearance.options}
            isScene={isScene}
            theme={exportTheme}
            isThemeReady={isScene || (theme.isAcknowledged && !hasIssues)}
            cameraPreset={theme.cameraPreset}
          />
        </>
      }
      tokens={
        isScene ? undefined : (
          <VideoThemePanel
            key={selected.id}
            item={{ id: selected.id, scopeLabel: t`This composition only` }}
            usedTokens={theme.usedTokens}
          />
        )
      }
    />
  );
}

/** One live composition with matching exports, its design tokens, and reusable study guidance. */
export function CompositionViewer({ selected, captions, onOptions }: Props) {
  const translate = useContinuityCopy();
  const player = useRef<HTMLIFrameElement>(null);
  const isScene = isSceneEntry(selected);
  const appearance = useCompositionAppearance(selected.id, player, isScene);
  const [tab, setTab] = useState<AtlasPanelTab>("details");
  useCompositionPlayer({ id: selected.id, player, onOptions });
  return (
    <section
      className={clsx(
        css.compositionViewer,
        tab === "tokens" && !isScene && css.isTokenPanel,
      )}
      aria-label={translate("Composition screening")}
    >
      <div className={css.stage}>
        <iframe
          key={selected.id}
          className={css.compositionViewerPlayer}
          ref={player}
          src={`/live.html?id=${encodeURIComponent(selected.id)}`}
          title={translate(selected.title)}
          onLoad={appearance.loaded}
          allowFullScreen
        />
      </div>
      <div className={css.details}>
        <CompositionSummary selected={selected} />
      </div>
      <div className={css.settings}>
        <CompositionSettings
          selected={selected}
          captions={captions}
          player={player}
          appearance={appearance}
          tab={tab}
          onTabChange={setTab}
        />
      </div>
      <div className={css.guidance}>
        {selected.family === "vocabulary" && (
          <VocabularyGuide entry={selected} />
        )}
        <CompositionNotice isScene={isScene} />
      </div>
    </section>
  );
}

function CompositionNotice({ isScene }: { isScene: boolean }) {
  const translate = useContinuityCopy();
  return (
    <p className={css.compositionViewerNotice}>
      {translate(
        isScene
          ? "Live React storyboard scenes. Fictional demonstration data. Window contents are curated fictional screenshots; figures, timings and diagrams are illustrations. Downloads render the current composition as authored."
          : "Live React compositions. Fictional demonstration data. Product states are scripted; architecture diagrams are illustrations. Plugin capabilities are future vision. Downloads render the current composition and caption selection.",
      )}
    </p>
  );
}
