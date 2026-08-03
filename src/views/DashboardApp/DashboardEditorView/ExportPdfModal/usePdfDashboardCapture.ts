import { useLingui } from "@lingui/react/macro";
import { notifyError } from "@ui";
import { useEffect, useState } from "react";
import { PdfExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfExport";

type PdfDashboardCapture = {
  baseCanvas: HTMLCanvasElement | undefined;
  isCapturing: boolean;
};

/** Captures the source dashboard once for the annotation workspace. */
export function usePdfDashboardCapture(
  sourceElement: HTMLElement | undefined,
): PdfDashboardCapture {
  const { t } = useLingui();
  const [baseCanvas, setBaseCanvas] = useState<HTMLCanvasElement | undefined>(
    undefined,
  );
  const [isCapturing, setIsCapturing] = useState(true);

  useEffect(
    function captureDashboard() {
      let isMounted = true;
      if (!sourceElement) {
        setIsCapturing(false);
        return;
      }
      void PdfExport.snapshotElement(sourceElement)
        .then((canvas) => {
          if (isMounted) {
            setBaseCanvas(canvas);
            setIsCapturing(false);
          }
        })
        .catch((error: unknown) => {
          if (!isMounted) {
            return;
          }
          console.error(error);
          notifyError({
            title: t`Couldn't capture dashboard`,
            message: t`Please try again.`,
          });
          setIsCapturing(false);
        });
      return () => {
        isMounted = false;
      };
    },
    [sourceElement, t],
  );

  return { baseCanvas, isCapturing };
}
