import { useEffect, useState } from "react";
import { StockGraphic } from "../../../stock/StockGraphic";
import { isReducedMotionPreferred } from "../isReducedMotionPreferred";
import { type Props as PaletteProps } from "../PaletteControls";
import { useFrames } from "../useGalleryClock";
import { PreviewDetails } from "./PreviewDetails";
import { PreviewPlaybackControls } from "./PreviewPlaybackControls";
import type { StockPresetId } from "../../../stock/catalog";
import type { ContentDraft } from "../ContentControls/ContentDraftModule/ContentDraftModule";
import type { Preset } from "../Preset.types";
import type { ReactNode } from "react";

/** Data for Props. */
type PropsResult = {
  preset: Preset;
  contentState: ContentDraft;
  onContentChange: (state: ContentDraft) => void;
  saved: boolean;
  initialPlaying: boolean;
  onSave: (id: StockPresetId) => void;
  onCopy: (text: string, label: string) => void;
  notice: string;
};

/** Per-motion player, content editor, and export controls. */
export type Props = PaletteProps & PropsResult;

/** Remounts for each motion to isolate playback and pending export status. */
export function PreviewDialogContent({
  preset,
  contentState,
  onContentChange,
  saved,
  initialPlaying,
  onSave,
  onCopy,
  notice,
  accent,
  background,
  setAccent,
  setBackground,
}: Props): ReactNode {
  const [playing, setPlaying] = useState(
    initialPlaying && !isReducedMotionPreferred(),
  );
  const [frame, setFrame] = useFrames(playing, preset.loopFrames);
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
  return (
    <div className="dialog-layout">
      <div className="dialog-player">
        <div className="dialog-stage">
          <div className="dialog-canvas">
            <StockGraphic
              {...({
                preset: preset.id,
                input: contentState.resolvedInput,
              } as import("../../../stock/contracts/StockContract.types").StockRequest)}
              frame={frame}
              accent={accent}
              background={background}
            />
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
      <PreviewDetails
        preset={preset}
        contentState={contentState}
        onContentChange={onContentChange}
        saved={saved}
        onSave={onSave}
        onCopy={onCopy}
        notice={notice}
        accent={accent}
        background={background}
        setAccent={setAccent}
        setBackground={setBackground}
      />
    </div>
  );
}
