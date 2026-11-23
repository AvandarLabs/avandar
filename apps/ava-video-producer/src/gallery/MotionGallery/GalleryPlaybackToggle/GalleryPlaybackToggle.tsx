import { Icon } from "../Icon";
import css from "./GalleryPlaybackToggle.module.css";
import type { ReactNode, Dispatch, SetStateAction } from "react";

type Props = {
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
};
/** Toggles the shared thumbnail playback state in GalleryToolbar. */
export function GalleryPlaybackToggle({
  playing,
  setPlaying,
}: Readonly<Props>): ReactNode {
  return (
    <button
      className={css.galleryPlaybackTogglePlayAll}
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
