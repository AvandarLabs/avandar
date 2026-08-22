import type { AnalyticsEventPayloads } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";

import { useLingui } from "@lingui/react/macro";
import { useCallback, useMemo, useRef, useState } from "react";

import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { DashboardPdfAnalyticsPayloads } from "@/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads";
import { HiddenDashboardRender } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/HiddenDashboardRender";
import { PdfAnnotationStep } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotationStep";
import { PdfExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfExport";
import { PdfExportChoice } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfExportChoice";
import { runTimedExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/runTimedExport/runTimedExport";
import { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";

type Props = {
  dashboard: Dashboard.T;
  onClose: () => void;
};

type Step = "choose" | "snapshot" | "annotate";

type PdfDashboardRender = {
  avaPageMetadata: ReturnType<typeof getAvaPageMetadataFromDashboard>;
  filename: string;
  puckConfig: ReturnType<typeof useDashboardPuckConfig>;
  puckData: ReturnType<typeof upgradeAvaPageData>;
};

type DirectPdfExportOptions = {
  dashboard: Dashboard.T;
  onExported: (durationMs: number) => void;
  filename: string;
  onClose: () => void;
  renderContainerRef: RefObject<HTMLDivElement | null>;
  setIsExporting: Dispatch<SetStateAction<boolean>>;
};

/**
 * Builds the one callback both export paths report through, so the payload is
 * assembled in a single place and the two paths can only differ by `mode`.
 */
function usePdfExportedLogger(dashboard: Dashboard.T): (
  options: Readonly<{
    durationMs: number;
    mode: AnalyticsEventPayloads["dashboard.pdf_exported"]["mode"];
  }>,
) => void {
  return useCallback(
    (options): void => {
      void AnalyticsClient.logEvent({
        event: "dashboard.pdf_exported",
        workspaceId: dashboard.workspaceId,
        app: "dashboards",
        payload: DashboardPdfAnalyticsPayloads.fromExported({
          dashboard,
          durationMs: options.durationMs,
          mode: options.mode,
        }),
      });
    },
    [dashboard],
  );
}

function buildPdfFilenameFromDashboardName(dashboardName: string): string {
  const filenameBase = (dashboardName || "dashboard")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return `${filenameBase || "dashboard"}.pdf`;
}

function usePdfDashboardRender(
  dashboard: Readonly<Dashboard.T>,
): PdfDashboardRender {
  const { t, i18n } = useLingui();
  const puckConfig = useDashboardPuckConfig({
    dashboardTitle: dashboard.name,
    workspaceId: dashboard.workspaceId,
    dashboardId: dashboard.id,
    i18n,
  });
  const puckData = useMemo(() => {
    const config = dashboard.config as AvaPageGenericData;
    return upgradeAvaPageData({
      ...config,
      root: {
        ...config.root,
        props: {
          ...config.root.props,
          title: dashboard.name || t`Untitled dashboard`,
          schemaVersion: getVersionFromAvaPageData(config),
        },
      },
    });
  }, [dashboard, t]);
  const avaPageMetadata = useMemo(() => {
    return getAvaPageMetadataFromDashboard({ dashboard, surface: "editor" });
  }, [dashboard]);
  return {
    avaPageMetadata,
    filename: buildPdfFilenameFromDashboardName(dashboard.name),
    puckConfig,
    puckData,
  };
}

function useDirectPdfExport(
  options: Readonly<DirectPdfExportOptions>,
): () => Promise<void> {
  const { t } = useLingui();
  const {
    dashboard,
    filename,
    onClose,
    onExported,
    renderContainerRef,
    setIsExporting,
  } = options;
  return useCallback(async (): Promise<void> => {
    const element = renderContainerRef.current;
    if (!element) {
      notifyError({ title: t`Dashboard not ready`, message: t`Try again.` });
      return;
    }
    setIsExporting(true);
    try {
      await runTimedExport({
        runExport: async () => {
          await PdfExport.captureAndDownloadPdf({
            element,
            filename,
            title: dashboard.name || t`Untitled dashboard`,
          });
        },
        onExported,
      });
      notifySuccess(t`PDF downloaded.`);
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
  }, [
    dashboard.name,
    filename,
    onClose,
    onExported,
    renderContainerRef,
    setIsExporting,
    t,
  ]);
}

/**
 * Two-step PDF export flow:
 *
 *   1. "choose": pick between immediate export or annotation-then-export.
 *   2a. "snapshot": capture the rendered dashboard once and let the user
 *       download it as a PDF directly.
 *   2b. "annotate": same snapshot but mounted into PdfAnnotator so the
 *       user can layer text, arrows, and freehand strokes (with adjustable
 *       roughness) before exporting.
 *
 * The capture itself renders the dashboard in an off-screen DOM container
 * using `<PuckPageRender>` directly (not the Puck editor frame), so the
 * editor chrome doesn't show up in the snapshot.
 */
export function ExportPdfModal({
  dashboard,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [step, setStep] = useState<Step>("choose");
  const renderContainerRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const render = usePdfDashboardRender(dashboard);
  const logPdfExported = usePdfExportedLogger(dashboard);
  // Each path reports its own mode, and both are memoized rather than inlined
  // so the callbacks below stay stable across renders.
  const onDirectExported = useCallback(
    (durationMs: number): void => {
      logPdfExported({ durationMs, mode: "direct" });
    },
    [logPdfExported],
  );
  const onAnnotatedExported = useCallback(
    (durationMs: number): void => {
      logPdfExported({ durationMs, mode: "annotated" });
    },
    [logPdfExported],
  );
  const onDirectExport = useDirectPdfExport({
    dashboard,
    filename: render.filename,
    onClose,
    onExported: onDirectExported,
    renderContainerRef,
    setIsExporting,
  });
  const hiddenRender = (
    <HiddenDashboardRender
      avaPageMetadata={render.avaPageMetadata}
      puckConfig={render.puckConfig}
      puckData={render.puckData}
      renderContainerRef={renderContainerRef}
    />
  );

  return step === "choose" ? (
    <PdfExportChoice
      hiddenRender={hiddenRender}
      isExporting={isExporting}
      onAnnotate={() => {
        setStep("annotate");
      }}
      onClose={onClose}
      onDirectExport={onDirectExport}
    />
  ) : (
    <PdfAnnotationStep
      filename={render.filename}
      hiddenRender={hiddenRender}
      onBack={() => {
        setStep("choose");
      }}
      onClose={onClose}
      onExported={onAnnotatedExported}
      sourceElement={renderContainerRef.current ?? undefined}
      title={dashboard.name || t`Untitled dashboard`}
    />
  );
}
