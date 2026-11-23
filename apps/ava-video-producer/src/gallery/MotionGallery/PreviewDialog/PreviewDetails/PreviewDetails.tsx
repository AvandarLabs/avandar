import { ContentControls } from "../../ContentControls/ContentControls";
import { PreviewCreativeDirection } from "../PreviewCreativeDirection/PreviewCreativeDirection";
import { PreviewDownloadLinks } from "../PreviewDownloadLinks/PreviewDownloadLinks";
import { PreviewKeywords } from "../PreviewKeywords/PreviewKeywords";
import { PreviewReferenceActions } from "../PreviewReferenceActions/PreviewReferenceActions";
import { usePreviewDownload } from "../usePreviewDownload";
import css from "./PreviewDetails.module.css";
import { PreviewExportNotice } from "./PreviewExportNotice/PreviewExportNotice";
import type { Props as PreviewProps } from "../PreviewDialogContent/PreviewDialogContent";
import type { ReactNode } from "react";
/**
 * Details, content editing, reference actions, and export status for one
 * motion.
 */
export type Props = Omit<PreviewProps, "initialPlaying">;
/** Presents the motion description, editable content, and reference actions. */
export function PreviewDetails({
  preset,
  contentState,
  onContentChange,
  saved,
  onSave,
  onCopy,
  notice,
  accent,
  background,
}: Readonly<Props>): ReactNode {
  const { exporting, exportStatus, canExport, download } = usePreviewDownload({
    preset,
    contentState,
  });
  return (
    <div className={css.previewDetailsDialogDetails}>
      <p
        className={css.previewDetailsDialogDescription}
        id="dialog-description"
      >
        {preset.description}
      </p>
      <ContentControls
        preset={preset.id}
        state={contentState}
        onChange={onContentChange}
      />
      <div className={css.previewDetailsDetailSection}>
        <h3>Good for</h3>
        <p>{preset.useWhen}</p>
      </div>
      <PreviewKeywords {...{ preset }} />
      <PreviewCreativeDirection {...{ preset }} />
      <PreviewReferenceActions
        {...{ contentState, preset, accent, background, onCopy, saved, onSave }}
      />
      <PreviewDownloadLinks
        {...{ preset, onCopy, download, exporting, contentState, canExport }}
      />
      <PreviewExportNotice {...{ exportStatus, notice }} />
    </div>
  );
}
