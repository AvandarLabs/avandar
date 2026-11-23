import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { useObservedTokenUsage } from "../../../../videoThemeEditor/createObservedTokenUsage/useObservedTokenUsage";
import { AtlasPanelTabs } from "../../../AtlasLayout/AtlasPanelTabs/AtlasPanelTabs";
import { useRememberedPanelTab } from "../../../AtlasLayout/AtlasPanelTabs/useRememberedPanelTab";
import { VideoThemePanel } from "../../../VideoThemePanel/VideoThemePanel";
import { useFrames } from "../../galleryClockHelpers";
import { isReducedMotionPreferred } from "../../isReducedMotionPreferred";
import { PreviewDetails } from "../PreviewDetails/PreviewDetails";
import { PreviewMotionCanvas } from "../PreviewMotionCanvas/PreviewMotionCanvas";
import { PreviewPlaybackControls } from "../PreviewPlaybackControls/PreviewPlaybackControls";
import css from "./PreviewDialogContent.module.css";
import type { StockPresetId } from "../../../../stock/stockEntry";
import type { ContentDraft } from "../../ContentControls/ContentDraftModule/ContentDraftModule";
import type { Preset } from "../../Preset.types";
import type { ReactNode } from "react";
/** Per-motion player, content editor, theme editor, and export controls. */
export type Props = {
  preset: Preset;
  contentState: ContentDraft;
  onContentChange: (state: ContentDraft) => void;
  saved: boolean;
  initialPlaying: boolean;
  onSave: (id: StockPresetId) => void;
  onCopy: (text: string, label: string) => void;
  notice: string;
  /**
   * The theme's resolved accent and ground, quoted in briefs and configured
   * JSON.
   */
  accent: string;
  background: string;
};
function usePlayingUnlessReducedMotion(initialPlaying: boolean) {
  const [playing, setPlaying] = useState(
    initialPlaying && !isReducedMotionPreferred(),
  );
  useEffect(function pauseOnReducedMotionPreference() {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseForPreference = () => {
      if (preference.matches) {
        setPlaying(false);
      }
    };
    preference.addEventListener("change", pauseForPreference);
    return () => {
      return preference.removeEventListener("change", pauseForPreference);
    };
  }, []);
  return [playing, setPlaying] as const;
}
/**
 * Remounts for each motion to isolate playback, pending exports, and the
 * editor's scope.
 */
export function PreviewDialogContent({
  initialPlaying,
  ...detailsProps
}: Readonly<Props>): ReactNode {
  const { preset, contentState } = detailsProps;
  const [playing, setPlaying] = usePlayingUnlessReducedMotion(initialPlaying);
  const [frame, setFrame] = useFrames({
    active: playing,
    length: preset.loopFrames,
  });
  const [tab, setTab] = useRememberedPanelTab(preset.id);
  const usage = useObservedTokenUsage();
  return (
    <div
      className={clsx("dialog-layout", tab === "tokens" && "is-token-panel")}
    >
      <div className={css.previewDialogContentDialogPlayer}>
        <PreviewMotionCanvas {...{ preset, contentState, frame, usage }} />
        <PreviewPlaybackControls
          playing={playing}
          setPlaying={setPlaying}
          frame={frame}
          setFrame={setFrame}
          loopFrames={preset.loopFrames}
        />
      </div>
      <AtlasPanelTabs
        tab={tab}
        onTabChange={setTab}
        details={<PreviewDetails {...detailsProps} />}
        tokens={
          <VideoThemePanel
            item={{
              id: preset.id,
              scopeLabel: "This motion only",
              name: "This motion",
            }}
            usedTokens={usage.paths}
          />
        }
      />
    </div>
  );
}
