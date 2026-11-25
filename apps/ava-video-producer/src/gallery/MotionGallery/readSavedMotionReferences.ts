import { findMotionPreset } from "./findMotionPreset";
import type { StockPresetId } from "../../stock/stockEntry";
/** The browser key used by the saved-reference reader and persistence hook. */
export const SAVED_KEY = "motion-atlas:saved:v1" as const;
/** Restores known, unique saved presets for the motion gallery on mount. */
export function readSavedMotionReferences(): StockPresetId[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(data)
      ? [
          ...new Set(
            data.filter((id): id is StockPresetId => {
              return typeof id === "string" && Boolean(findMotionPreset(id));
            }),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
