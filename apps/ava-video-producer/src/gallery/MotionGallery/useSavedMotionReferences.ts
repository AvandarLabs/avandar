import { useCallback, useEffect, useState } from "react";
import {
  readSavedMotionReferences,
  SAVED_KEY,
} from "./readSavedMotionReferences";
import type { StockPresetId } from "../../stock/stockEntry";
import type { MotionGalleryState } from "./useMotionGalleryState/useMotionGalleryState.types";
/** Keeps the motion gallery's saved references available across visits. */
export function useSavedMotionReferences(): Pick<
  MotionGalleryState,
  "saved" | "setSaved" | "onSave"
> {
  const [saved, setSaved] = useState<StockPresetId[]>(
    readSavedMotionReferences,
  );
  useEffect(
    function persistSavedReferences() {
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
      } catch {
        // Saving remains available for this visit.
      }
    },
    [saved],
  );
  const onSave = useCallback((id: StockPresetId) => {
    return setSaved((previous) => {
      return previous.includes(id)
        ? previous.filter((value) => {
            return value !== id;
          })
        : [...previous, id];
    });
  }, []);
  return { saved, setSaved, onSave };
}
