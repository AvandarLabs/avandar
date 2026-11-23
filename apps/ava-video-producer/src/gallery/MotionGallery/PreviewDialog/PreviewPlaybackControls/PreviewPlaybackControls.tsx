import { PreviewTransport } from "../PreviewTransport/PreviewTransport";
import css from "./PreviewPlaybackControls.module.css";
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
    <div className={css.previewPlaybackControlsPlayerControls}>
      <PreviewTransport
        {...{ playing, setPlaying, frame, setFrame, loopFrames }}
      />
      <label
        className={css.previewPlaybackControlsSrOnly}
        htmlFor="frame-scrubber"
      >
        Preview frame
      </label>
      <input
        id="frame-scrubber"
        className={css.previewPlaybackControlsFrameScrubber}
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
      <div className={css.previewPlaybackControlsScrubberLabels}>
        <span>FRAME {String(frame).padStart(3, "0")}</span>
        <span>DRAG TO EXPLORE</span>
        <span>{loopFrames} FRAMES</span>
      </div>
    </div>
  );
}
