import type { PreviewDialog } from "../PreviewDialog/PreviewDialog";
import type { MotionGalleryState } from "../useMotionGalleryState/useMotionGalleryState";
import type { ComponentProps } from "react";

/** Gallery selection and theme colors supplied to the preview dialog. */
export type MotionLibraryPreviewOptions = {
  state: MotionGalleryState;
  accent: string;
  background: string;
  selectedColors: { accent: string; background: string } | undefined;
};

/** Binds selected-preset navigation and edits to the existing gallery state. */
export function getMotionLibraryPreviewProps({
  state,
  accent,
  background,
  selectedColors,
}: Readonly<MotionLibraryPreviewOptions>):
  | ComponentProps<typeof PreviewDialog>
  | undefined {
  const { selected, previousPreset, nextPreset } = state;
  if (!selected) {
    return undefined;
  }
  return {
    accent: selectedColors?.accent ?? accent,
    background: selectedColors?.background ?? background,
    preset: selected,
    onPrevious: previousPreset
      ? () => {
          return state.onOpen(previousPreset);
        }
      : undefined,
    onNext: nextPreset
      ? () => {
          return state.onOpen(nextPreset);
        }
      : undefined,
    contentState: state.contentState!,
    onContentChange: (contentDraft) => {
      return state.updateContent(selected.id, contentDraft);
    },
    saved: state.saved.includes(selected.id),
    initialPlaying: state.playing,
    onClose: state.onClose,
    onSave: state.onSave,
    onCopy: state.onCopy,
    notice: state.notice,
  };
}
