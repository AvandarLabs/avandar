import { useEffect } from "react";
import { findMotionPreset } from "./findMotionPreset";
import type { Preset } from "./Preset.types";
import type { Dispatch, SetStateAction } from "react";

type Options = {
  setSelected: Dispatch<SetStateAction<Preset | undefined>>;
  setPlaying: Dispatch<SetStateAction<boolean>>;
};
/**
 * Synchronizes gallery navigation and motion preference for its mounted life.
 */
export function useMotionLocationSync({
  setSelected,
  setPlaying,
}: Readonly<Options>): void {
  useEffect(
    function syncSelectionWithUrlAndMotionPreference() {
      const update = () => {
        return setSelected(findMotionPreset(window.location.hash.slice(1)));
      };
      window.addEventListener("hashchange", update);
      window.addEventListener("popstate", update);
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const changeMotion = () => {
        if (media.matches) {
          setPlaying(false);
        }
      };
      media.addEventListener("change", changeMotion);
      return () => {
        window.removeEventListener("hashchange", update);
        window.removeEventListener("popstate", update);
        media.removeEventListener("change", changeMotion);
      };
    },
    [setSelected, setPlaying],
  );
}
