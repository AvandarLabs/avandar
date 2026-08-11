import { useLingui } from "@lingui/react/macro";
import { useCallback, useState } from "react";
import { notifyError } from "@/utils/notifications/notify";
import { PdfExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfExport";
import type { RefObject } from "react";

type UseAnnotatedPdfExportOptions = {
  sourceElement: HTMLElement | undefined;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  filename: string;
  title: string;
  onClose: () => void;
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
  const { filename, onClose, overlayRef, sourceElement, title } = options;
  const [isExporting, setIsExporting] = useState(false);
  const exportPdf = useCallback(async (): Promise<void> => {
    if (!sourceElement || !overlayRef.current) {
      return;
    }
    setIsExporting(true);
    try {
      await PdfExport.captureAndDownloadPdf({
        element: sourceElement,
        annotationCanvas: overlayRef.current,
        filename,
        title,
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
  }, [filename, onClose, overlayRef, sourceElement, t, title]);
  return { isExporting, exportPdf };
}
