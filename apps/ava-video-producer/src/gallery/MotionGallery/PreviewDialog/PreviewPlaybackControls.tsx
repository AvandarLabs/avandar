import { Trans, useLingui as useGalleryLingui } from "@lingui/react/macro";
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
  const { t } = useGalleryLingui();
  return (
    <div className="player-controls">
      <div className="transport-row">
        <button
          className="transport-button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? t`Pause preview` : t`Play preview`}
        >
          <Icon name={playing ? "pause" : "play"} size={17} />
          <span>{playing ? t`Pause` : t`Play`}</span>
        </button>
        <button
          className="icon-button"
          onClick={() => setFrame(0)}
          aria-label={t`Restart preview`}
        >
          <Icon name="restart" size={17} />
        </button>
        <output
          className="time-code"
          aria-label={t`Current time`}
          aria-live="off"
        >
          {(frame / 30).toFixed(2)}{" "}
          <span>
            <Trans>/</Trans>
            {(loopFrames / 30).toFixed(2)}
            <Trans>s</Trans>
          </span>
        </output>
        <span className="frame-rate">
          <Trans>30 FPS</Trans>
        </span>
      </div>
      <label className="sr-only" htmlFor="frame-scrubber">
        <Trans>Preview frame</Trans>
      </label>
      <input
        id="frame-scrubber"
        className="frame-scrubber"
        type="range"
        min={0}
        max={loopFrames - 1}
        value={frame}
        aria-valuetext={t`Frame ${frame} of ${loopFrames - 1}`}
        onChange={(event) => {
          setPlaying(false);
          setFrame(Number(event.target.value));
        }}
      />
      <div className="scrubber-labels">
        <span>
          <Trans>FRAME {String(frame).padStart(3, "0")}</Trans>
        </span>
        <span>
          <Trans>DRAG TO EXPLORE</Trans>
        </span>
        <span>
          <Trans>{loopFrames} FRAMES</Trans>
        </span>
      </div>
    </div>
  );
}
