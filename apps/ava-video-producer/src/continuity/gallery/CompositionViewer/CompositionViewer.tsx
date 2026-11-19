import clsx from "clsx";
import { useRef } from "react";
import { useRememberedPanelTab } from "../../../gallery/AtlasLayout/AtlasPanelTabs/useRememberedPanelTab";
import { isSceneEntry } from "../../continuityCatalog";
import { CompositionSettings } from "./CompositionSettings/CompositionSettings";
import { CompositionStage } from "./CompositionStage/CompositionStage";
import { CompositionSummary } from "./CompositionSummary";
import css from "./CompositionViewer.module.css";
import { useCompositionAppearance } from "./useCompositionAppearance";
import { useCompositionPlayer } from "./useCompositionPlayer";
import { VocabularyGuide } from "./VocabularyGuide/VocabularyGuide";
import type { ContinuityCatalogEntry } from "../../continuityCatalog";
import type { ReactNode } from "react";

type Props = {
  selected: ContinuityCatalogEntry;
  captions: boolean | undefined;
  onOptions: (options: { id: string; captions: boolean }) => void;
};

/**
 * One live composition with matching exports, its design tokens, and reusable
 * study guidance.
 */
export function CompositionViewer({
  selected,
  captions,
  onOptions,
}: Props): ReactNode {
  const player = useRef<HTMLIFrameElement>(null);
  const isScene = isSceneEntry(selected);
  const appearance = useCompositionAppearance(selected.id, player, isScene);
  const [tab, setTab] = useRememberedPanelTab(selected.id);
  useCompositionPlayer({ id: selected.id, player, onOptions });
  const isTokenPanel = tab === "tokens" && !isScene;
  return (
    <section
      className={clsx(css.compositionViewer, isTokenPanel && css.isTokenPanel)}
      aria-label="Composition screening"
    >
      <CompositionStage
        selected={selected}
        player={player}
        isTokenPanel={isTokenPanel}
        onLoad={appearance.loaded}
      />
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
  return (
    <p className={css.compositionViewerNotice}>
      {isScene
        ? "Live React storyboard scenes. Fictional demonstration data. Window contents are curated fictional screenshots; figures, timings and diagrams are illustrations. Downloads render the current composition as authored."
        : "Live React compositions. Fictional demonstration data. Product states are scripted; architecture diagrams are illustrations. Plugin capabilities are future vision. Downloads render the current composition and caption selection."}
    </p>
  );
}
