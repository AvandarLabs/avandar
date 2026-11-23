import { useMemo } from "react";
import { ContentDraftModule } from "../ContentControls/ContentDraftModule/ContentDraftModule";
import { useMotionDrafts } from "../useMotionDrafts";
import { useMotionFilters } from "../useMotionFilters";
import { useMotionNotice } from "../useMotionNotice";
import { useMotionRebuild } from "../useMotionRebuild";
import { useMotionResults } from "../useMotionResults";
import { useMotionSelection } from "../useMotionSelection";
import { useSavedMotionReferences } from "../useSavedMotionReferences";
import type { MotionGalleryState } from "./useMotionGalleryState.types";

export type { MotionGalleryState } from "./useMotionGalleryState.types";
/**
 * Coordinates selection, editable content and playback for the motion
 * gallery.
 */
export function useMotionGalleryState(): MotionGalleryState {
  useMotionRebuild();
  const filters = useMotionFilters();
  const content = useMotionDrafts();
  const notices = useMotionNotice();
  const references = useSavedMotionReferences();
  const selection = useMotionSelection({
    setNotice: notices.setNotice,
    setPlaying: filters.setPlaying,
  });
  const { selected } = selection;
  const { drafts } = content;
  const contentState = useMemo(() => {
    return selected
      ? (drafts[selected.id] ?? ContentDraftModule.fromPreset(selected.id))
      : undefined;
  }, [selected, drafts]);
  const results = useMotionResults({ ...filters, ...references, selected });
  return {
    ...filters,
    ...content,
    ...references,
    ...selection,
    ...results,
    contentState,
    onCopy: notices.onCopy,
    notice: notices.notice,
  };
}
