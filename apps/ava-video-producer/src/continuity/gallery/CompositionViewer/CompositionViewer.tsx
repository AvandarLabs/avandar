import { clsx } from "clsx";
import { useRef } from "react";
import { useRememberedPanelTab } from "../../../gallery/AtlasLayout/AtlasPanelTabs/useRememberedPanelTab";
import { isSceneEntry } from "../../isSceneEntry";
import { CompositionGuidance } from "./CompositionGuidance";
import { CompositionSettings } from "./CompositionSettings/CompositionSettings";
import { CompositionStage } from "./CompositionStage/CompositionStage";
import { CompositionSummary } from "./CompositionSummary/CompositionSummary";
import css from "./CompositionViewer.module.css";
import { useCompositionAppearance } from "./useCompositionAppearance/useCompositionAppearance";
import { useCompositionPlayer } from "./useCompositionPlayer";
import type { ContinuityCatalogEntry } from "../../isSceneEntry";
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
}: Readonly<Props>): ReactNode {
  const player = useRef<HTMLIFrameElement>(null);
  const isScene = isSceneEntry(selected);
  const appearance = useCompositionAppearance({
    id: selected.id,
    player,
    isScene,
  });
  const [tab, setTab] = useRememberedPanelTab(selected.id);
  useCompositionPlayer({ id: selected.id, player, onOptions });
  const isTokenPanel = tab === "tokens" && !isScene;
  return (
    <section
      className={clsx(
        css.compositionViewer,
        isTokenPanel && css.compositionViewerIsTokenPanel,
      )}
      aria-label="Composition screening"
    >
      <CompositionStage
        selected={selected}
        player={player}
        isTokenPanel={isTokenPanel}
        onLoad={appearance.loaded}
      />
      <div className={css.compositionViewerDetails}>
        <CompositionSummary selected={selected} />
      </div>
      <div className={css.compositionViewerSettings}>
        <CompositionSettings
          {...{ selected, captions, player, appearance, tab }}
          onTabChange={setTab}
        />
      </div>
      <CompositionGuidance selected={selected} isScene={isScene} />
    </section>
  );
}
