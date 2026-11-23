import { Icon } from "../../MotionGallery/Icon";
import css from "./HelperPlaybackToggle.module.css";
import type { ReactNode, Dispatch, SetStateAction } from "react";

type Props = {
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
};
/** Toggles animation playback for the helper browsing grid. */
export function HelperPlaybackToggle({
  playing,
  setPlaying,
}: Readonly<Props>): ReactNode {
  return (
    <button
      type="button"
      className={css.helperPlaybackTogglePlayAll}
      onClick={() => {
        return setPlaying((value) => {
          return !value;
        });
      }}
      aria-label={playing ? "Pause all animations" : "Play all animations"}
    >
      <Icon name={playing ? "pause" : "play"} size={15} />
      <span>{playing ? "Pause all" : "Play all"}</span>
    </button>
  );
}
