import { useRef } from "react";
import { isSceneEntry } from "../../continuityCatalog";
import { useContinuityCopy } from "../../useContinuityCopy";
import { CompositionActions } from "./CompositionActions/CompositionActions";
import { CompositionControls } from "./CompositionControls";
import { CompositionSummary } from "./CompositionSummary";
import css from "./CompositionViewer.module.css";
import { useCompositionAppearance } from "./useCompositionAppearance";
import { useCompositionPlayer } from "./useCompositionPlayer";
import { VocabularyGuide } from "./VocabularyGuide/VocabularyGuide";
import type { ContinuityCatalogEntry } from "../../continuityCatalog";

type Props = {
  selected: ContinuityCatalogEntry;
  captions: boolean | undefined;
  onOptions: (options: { id: string; captions: boolean }) => void;
};

/** One live composition with matching exports and reusable study guidance. */
export function CompositionViewer({ selected, captions, onOptions }: Props) {
  const translate = useContinuityCopy();
  const player = useRef<HTMLIFrameElement>(null);
  const isScene = isSceneEntry(selected);
  const appearance = useCompositionAppearance(selected.id, player, isScene);
  useCompositionPlayer({ id: selected.id, player, onOptions });
  return (
    <section
      className={css.compositionViewer}
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
        <CompositionControls appearance={appearance} isScene={isScene} />
        <CompositionActions
          id={selected.id}
          captions={captions}
          options={appearance.options}
          isScene={isScene}
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
