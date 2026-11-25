import { useContext } from "react";
import { ContinuityAppearanceContext } from "./ContinuityAppearanceContext";
import type { ContinuityAppearance } from "./ContinuityAppearanceContext";
/** Read the current film's live/export render switches. */
export function useContinuityAppearance(): ContinuityAppearance {
  return useContext(ContinuityAppearanceContext);
}
