import { Icon } from "../../Icon";
import css from "./PreviewTransport.module.css";
import type { ReactNode, Dispatch, SetStateAction } from "react";

type Props = {
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
  frame: number;
  setFrame: (frame: number) => void;
  loopFrames: number;
};
/** Presents playback, restart and elapsed time in PreviewPlaybackControls. */
export function PreviewTransport({
  playing,
  setPlaying,
  frame,
  setFrame,
  loopFrames,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.previewTransportTransportRow}>
      <button
        className={css.previewTransportTransportButton}
        onClick={() => {
          return setPlaying((value) => {
            return !value;
          });
        }}
        aria-label={playing ? "Pause preview" : "Play preview"}
      >
        <Icon name={playing ? "pause" : "play"} size={17} />
        <span>{playing ? "Pause" : "Play"}</span>
      </button>
      <button
        className={css.previewTransportIconButton}
        onClick={() => {
          return setFrame(0);
        }}
        aria-label="Restart preview"
      >
        <Icon name="restart" size={17} />
      </button>
      <output
        className={css.previewTransportTimeCode}
        aria-label="Current time"
        aria-live="off"
      >
        {(frame / 30).toFixed(2)} <span>/{(loopFrames / 30).toFixed(2)}s</span>
      </output>
      <span className={css.previewTransportFrameRate}>30 FPS</span>
    </div>
  );
}
