import type { ContinuityAppearance } from "../../../continuityAppearance/continuityAppearance";
import type { Dispatch, SetStateAction } from "react";
/** Update, transmit and retain the current draft without requiring storage. */
export function updateCompositionAppearance({
  patch,
  draft,
  setDraft,
  isScene,
  send,
}: Readonly<{
  patch: Partial<ContinuityAppearance>;
  draft: ContinuityAppearance;
  setDraft: Dispatch<SetStateAction<ContinuityAppearance>>;
  isScene: boolean;
  send: (action: string, value?: unknown) => void;
}>): void {
  const nextDraft = { ...draft, ...patch };
  setDraft(nextDraft);
  if (!isScene) {
    send("appearance", nextDraft);
  }
  try {
    localStorage.setItem(
      "composition-appearance:v2",
      JSON.stringify(nextDraft),
    );
  } catch {
    // Preferences remain usable when storage is unavailable.
  }
}
