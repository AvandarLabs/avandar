import { useLingui as useGalleryLingui } from "@lingui/react/macro";
import { useState } from "react";
import { downloadFilm } from "../../../../showcase/download.js";
import type { Props as PreviewProps } from "./PreviewDialogContent";
type Options = Pick<
  PreviewProps,
  "preset" | "contentState" | "accent" | "background"
>;
/** Tracks an MP4 download and surfaces its progress and failures. */
export function usePreviewDownload({
  preset,
  contentState,
  accent,
  background,
}: Readonly<Options>): {
  exporting: boolean;
  exportStatus: string;
  download: () => Promise<void>;
} {
  const { t } = useGalleryLingui();

  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const download = async () => {
    setExporting(true);
    try {
      await downloadFilm({
        id: `stock-${preset.id}`,
        options: {
          accent,
          background,
          schemaVersion: 1,
          input: contentState.resolvedInput,
        },
        onStatus: (status) => setExportStatus(status.message),
      });
    } catch (error) {
      setExportStatus(
        error instanceof Error ? error.message : t`Export failed. Try again.`,
      );
    } finally {
      setExporting(false);
    }
  };
  return { exporting, exportStatus, download };
}
