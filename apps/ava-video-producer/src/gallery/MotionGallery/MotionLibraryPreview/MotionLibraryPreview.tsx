import { PreviewDialog } from "../PreviewDialog/PreviewDialog";
import { getMotionLibraryPreviewProps } from "./getMotionLibraryPreviewProps";
import type { MotionLibraryPreviewOptions } from "./getMotionLibraryPreviewProps";
import type { ReactNode } from "react";

type Props = MotionLibraryPreviewOptions;

/** The selected preset's preview retains the gallery's state and navigation. */
export function MotionLibraryPreview({
  state,
  accent,
  background,
  selectedColors,
}: Readonly<Props>): ReactNode {
  const props = getMotionLibraryPreviewProps({
    state,
    accent,
    background,
    selectedColors,
  });
  return props ? <PreviewDialog {...props} /> : null;
}
