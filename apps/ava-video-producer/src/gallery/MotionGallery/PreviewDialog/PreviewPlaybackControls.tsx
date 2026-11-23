import { Icon } from "../Icon";
import type { ReactNode, Dispatch, SetStateAction } from "react";
/** Playback transport and frame scrubber inputs. */
export type Props = {
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
  frame: number;
  setFrame: (frame: number) => void;
  loopFrames: number;
};
/** Controls the shared preview playback state. */
export function PreviewPlaybackControls({
  playing,
  setPlaying,
  frame,
  setFrame,
  loopFrames,
}: Readonly<Props>): ReactNode {
  return (
    <div className="player-controls">
      <div className="transport-row">
        <button
          className="transport-button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          <Icon name={playing ? "pause" : "play"} size={17} />
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
        <button
          className="icon-button"
          onClick={() => setFrame(0)}
          aria-label="Restart preview"
        >
          <Icon name="restart" size={17} />
        </button>
        <output className="time-code" aria-label="Current time" aria-live="off">
          {(frame / 30).toFixed(2)}{" "}
          <span>/{(loopFrames / 30).toFixed(2)}s</span>
        </output>
        <span className="frame-rate">30 FPS</span>
      </div>
      <label className="sr-only" htmlFor="frame-scrubber">
        Preview frame
      </label>
      <input
        id="frame-scrubber"
        className="frame-scrubber"
        type="range"
        min={0}
        max={loopFrames - 1}
        value={frame}
        aria-valuetext={`Frame ${frame} of ${loopFrames - 1}`}
        onChange={(event) => {
          setPlaying(false);
          setFrame(Number(event.target.value));
        }}
      />
      <div className="scrubber-labels">
        <span>FRAME {String(frame).padStart(3, "0")}</span>
        <span>DRAG TO EXPLORE</span>
        <span>{loopFrames} FRAMES</span>
      </div>
    </div>
  );
}
