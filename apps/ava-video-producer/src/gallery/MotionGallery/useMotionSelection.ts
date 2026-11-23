import { useCallback, useState } from "react";
import { findMotionPreset } from "./findMotionPreset";
import { useMotionLocationSync } from "./useMotionLocationSync";
import type { Preset } from "./Preset.types";
import type { MotionGalleryState } from "./useMotionGalleryState/useMotionGalleryState.types";
import type { Dispatch, SetStateAction } from "react";

type Options = {
  setNotice: Dispatch<SetStateAction<string>>;
  setPlaying: Dispatch<SetStateAction<boolean>>;
};
/**
 * Owns the open motion and its URL while preserving gallery notice behavior.
 */
export function useMotionSelection({
  setNotice,
  setPlaying,
}: Readonly<Options>): Pick<
  MotionGalleryState,
  "selected" | "onOpen" | "onClose"
> {
  const [selected, setSelected] = useState<Preset | undefined>(() => {
    return findMotionPreset(window.location.hash.slice(1));
  });
  useMotionLocationSync({ setSelected, setPlaying });
  const onOpen = useCallback(
    (preset: Preset) => {
      setNotice("");
      setSelected(preset);
      window.history.pushState(null, "", `#${preset.id}`);
    },
    [setNotice],
  );
  const onClose = useCallback(() => {
    setSelected(undefined);
    setNotice("");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, [setNotice]);
  return { selected, onOpen, onClose };
}
