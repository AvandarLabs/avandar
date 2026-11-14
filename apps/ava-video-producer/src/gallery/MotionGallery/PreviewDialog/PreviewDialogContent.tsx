import { useLingui as useGalleryLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { StockGraphic } from "../../../stock/StockGraphic";
import { VideoTokenUsageContext } from "../../../videoTheme/tokenUsage/tokenUsage";
import { useObservedTokenUsage } from "../../../videoThemeEditor/observedTokenUsage/useObservedTokenUsage";
import { AtlasPanelTabs } from "../../AtlasLayout/AtlasPanelTabs/AtlasPanelTabs";
import { useRememberedPanelTab } from "../../AtlasLayout/AtlasPanelTabs/useRememberedPanelTab";
import { GalleryItemTheme } from "../../GalleryVideoTheme/GalleryItemTheme";
import { VideoThemePanel } from "../../VideoThemePanel/VideoThemePanel";
import { isReducedMotionPreferred } from "../isReducedMotionPreferred";
import { useFrames } from "../useGalleryClock";
import { PreviewDetails } from "./PreviewDetails";
import { PreviewPlaybackControls } from "./PreviewPlaybackControls";
import type { StockPresetId } from "../../../stock/catalog";
import type { StockRequest } from "../../../stock/contracts/StockContract.types";
import type { ContentDraft } from "../ContentControls/ContentDraftModule/ContentDraftModule";
import type { Preset } from "../Preset.types";
import type { ReactNode } from "react";

/** Per-motion player, content editor, theme editor, and export controls. */
export type Props = Readonly<{
  preset: Preset;
  contentState: ContentDraft;
  onContentChange: (state: ContentDraft) => void;
  saved: boolean;
  initialPlaying: boolean;
  onSave: (id: StockPresetId) => void;
  onCopy: (text: string, label: string) => void;
  notice: string;
  /** The theme's resolved accent and ground, quoted in briefs and configured JSON. */
  accent: string;
  background: string;
}>;

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
    return () => preference.removeEventListener("change", pauseForPreference);
  }, []);
  return [playing, setPlaying] as const;
}

/** Remounts for each motion to isolate playback, pending exports, and the editor's scope. */
export function PreviewDialogContent(props: Props): ReactNode {
  const { t } = useGalleryLingui();
  const { preset, contentState } = props;
  const [playing, setPlaying] = usePlayingUnlessReducedMotion(
    props.initialPlaying,
  );
  const [frame, setFrame] = useFrames(playing, preset.loopFrames);
  const [tab, setTab] = useRememberedPanelTab(preset.id);
  const usage = useObservedTokenUsage();
  return (
    <div
      className={clsx("dialog-layout", tab === "tokens" && "is-token-panel")}
    >
      <div className="dialog-player">
        <div className="dialog-stage">
          <div className="dialog-canvas">
            <GalleryItemTheme itemId={preset.id}>
              <VideoTokenUsageContext.Provider value={usage.report}>
                <StockGraphic
                  {...({
                    preset: preset.id,
                    input: contentState.resolvedInput,
                  } as StockRequest)}
                  frame={frame}
                />
              </VideoTokenUsageContext.Provider>
            </GalleryItemTheme>
          </div>
        </div>
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
        details={<PreviewDetails {...props} />}
        tokens={
          <VideoThemePanel
            item={{
              id: preset.id,
              scopeLabel: t`This motion only`,
              name: t`This motion`,
            }}
            usedTokens={usage.paths}
          />
        }
      />
    </div>
  );
}
