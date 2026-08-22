import { useLingui } from "@lingui/react/macro";
import { useCallback, useState } from "react";
import { notifyError } from "@/utils/notifications/notify";
import { PdfExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfExport";
import { runTimedExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/runTimedExport/runTimedExport";
import type { RefObject } from "react";

type UseAnnotatedPdfExportOptions = {
  sourceElement: HTMLElement | undefined;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  filename: string;
  title: string;
  onClose: () => void;
  /** Called with the wall-clock duration after a successful export only. */
  onExported: (durationMs: number) => void;
};

type AnnotatedPdfExport = {
  isExporting: boolean;
  exportPdf: () => Promise<void>;
};

/** Exports the source dashboard with the current annotation overlay. */
export function useAnnotatedPdfExport(
  options: Readonly<UseAnnotatedPdfExportOptions>,
): AnnotatedPdfExport {
  const { t } = useLingui();
  const { filename, onClose, onExported, overlayRef, sourceElement, title } =
    options;
  const [isExporting, setIsExporting] = useState(false);
  const exportPdf = useCallback(async (): Promise<void> => {
    const overlayCanvas = overlayRef.current;
    if (!sourceElement || !overlayCanvas) {
      return;
    }
    setIsExporting(true);
    try {
      await runTimedExport({
        runExport: async () => {
          await PdfExport.captureAndDownloadPdf({
            element: sourceElement,
            annotationCanvas: overlayCanvas,
            filename,
            title,
          });
        },
        onExported,
      });
      onClose();
    } catch (error: unknown) {
      console.error(error);
      notifyError({
        title: t`Couldn't export PDF`,
        message: t`Please try again. The PDF was not created.`,
      });
    } finally {
      setIsExporting(false);
    }
  }, [filename, onClose, onExported, overlayRef, sourceElement, t, title]);
  return { isExporting, exportPdf };
}
