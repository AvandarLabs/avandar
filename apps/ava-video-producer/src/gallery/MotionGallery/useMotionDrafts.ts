import { useState } from "react";
import type { StockPresetId } from "../../stock/stockEntry";
import type { ContentDraft } from "./ContentControls/ContentDraftModule/ContentDraftModule";
import type { MotionGalleryState } from "./useMotionGalleryState/useMotionGalleryState.types";
/** Retains each motion's content edits while gallery selection changes. */
export function useMotionDrafts(): Pick<
  MotionGalleryState,
  "drafts" | "updateContent"
> {
  const [drafts, setDrafts] = useState<
    Partial<Record<StockPresetId, ContentDraft>>
  >({});
  const updateContent = (id: StockPresetId, state: Readonly<ContentDraft>) => {
    return setDrafts((previous) => {
      return { ...previous, [id]: state };
    });
  };
  return { drafts, updateContent };
}
