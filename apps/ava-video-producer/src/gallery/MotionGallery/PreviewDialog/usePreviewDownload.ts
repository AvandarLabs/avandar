import { useState } from "react";
import { downloadFilm } from "../../../../showcase/download.js";
import { createExportThemeFromDraft } from "../../../videoThemeEditor/themeDraft/themeDraft";
import { useGalleryVideoTheme } from "../../GalleryVideoTheme/useGalleryVideoTheme";
import type { Props as PreviewProps } from "./PreviewDialogContent";

/**
 * Tracks an MP4 download of the previewed motion with the theme the preview
 * shows, unsaved edits included, and surfaces progress and failures. An
 * invalid draft cannot be exported.
 */
export function usePreviewDownload({
  preset,
  contentState,
}: Readonly<Pick<PreviewProps, "preset" | "contentState">>): {
  exporting: boolean;
  exportStatus: string;
  canExport: boolean;
  download: () => Promise<void>;
} {
  const { library, themeId, validDraft, hasIssues } = useGalleryVideoTheme();
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const download = async () => {
    setExporting(true);
    try {
      await downloadFilm({
        id: `stock-${preset.id}`,
        options: {
          schemaVersion: 1,
          input: contentState.resolvedInput,
          theme: createExportThemeFromDraft({
            library,
            themeId,
            draft: validDraft,
            itemId: preset.id,
          }),
        },
        onStatus: (status) => {
          return setExportStatus(status.message);
        },
      });
    } catch (error) {
      setExportStatus(
        error instanceof Error ? error.message : "Export failed. Try again.",
      );
    } finally {
      setExporting(false);
    }
  };
  return { exporting, exportStatus, canExport: !hasIssues, download };
}
