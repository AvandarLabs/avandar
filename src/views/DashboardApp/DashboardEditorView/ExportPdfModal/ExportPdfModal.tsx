import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Box, Button, Group, Stack, Text } from "@mantine/core";
import { Render as PuckPageRender } from "@puckeditor/core";
import {
  IconArrowRight,
  IconFileExport,
  IconPencil,
} from "@tabler/icons-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { PdfAnnotator } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotator";
import { PdfExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfExport";
import { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";

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
  filename: string;
  onClose: () => void;
  renderContainerRef: RefObject<HTMLDivElement | null>;
  setIsExporting: Dispatch<SetStateAction<boolean>>;
};

type HiddenDashboardRenderOptions = {
  avaPageMetadata: PdfDashboardRender["avaPageMetadata"];
  puckConfig: PdfDashboardRender["puckConfig"];
  puckData: PdfDashboardRender["puckData"];
  renderContainerRef: RefObject<HTMLDivElement | null>;
};

type PdfExportChoiceOptions = {
  hiddenRender: ReactNode;
  isExporting: boolean;
  onAnnotate: () => void;
  onClose: () => void;
  onDirectExport: () => Promise<void>;
};

type PdfAnnotationStepOptions = {
  filename: string;
  hiddenRender: ReactNode;
  onBack: () => void;
  onClose: () => void;
  sourceElement: HTMLDivElement | undefined;
  title: string;
};

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
  const { dashboard, filename, onClose, renderContainerRef, setIsExporting } =
    options;
  return useCallback(async (): Promise<void> => {
    if (!renderContainerRef.current) {
      notifyError({ title: t`Dashboard not ready`, message: t`Try again.` });
      return;
    }
    setIsExporting(true);
    try {
      await PdfExport.captureAndDownloadPdf({
        element: renderContainerRef.current,
        filename,
        title: dashboard.name || t`Untitled dashboard`,
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
    renderContainerRef,
    setIsExporting,
    t,
  ]);
}

function _getHiddenDashboardRender(
  options: Readonly<HiddenDashboardRenderOptions>,
): ReactNode {
  return (
    <Box
      ref={options.renderContainerRef}
      style={{
        position: "fixed",
        top: 0,
        left: "-10000px",
        width: 1100,
        background: "white",
        zIndex: -1,
      }}
      aria-hidden
    >
      <DashboardFilterStateManager.Provider>
        <PuckPageRender
          config={options.puckConfig}
          data={options.puckData}
          metadata={options.avaPageMetadata}
        />
      </DashboardFilterStateManager.Provider>
    </Box>
  );
}

function _getPdfExportActions(
  options: Readonly<{
    isExporting: boolean;
    onAnnotate: () => void;
    onDirectExport: () => Promise<void>;
  }>,
): ReactNode {
  return (
    <Stack gap="sm">
      <Button
        size="md"
        variant="outline"
        leftSection={<IconFileExport size={18} />}
        rightSection={<IconArrowRight size={16} />}
        loading={options.isExporting}
        onClick={options.onDirectExport}
        justify="space-between"
      >
        <Trans>Export as PDF</Trans>
      </Button>
      <Button
        size="md"
        leftSection={<IconPencil size={18} />}
        rightSection={<IconArrowRight size={16} />}
        onClick={options.onAnnotate}
        justify="space-between"
      >
        <Trans>Annotate, then export</Trans>
      </Button>
    </Stack>
  );
}

function _getPdfExportChoice(
  options: Readonly<PdfExportChoiceOptions>,
): ReactNode {
  return (
    <Stack gap="md">
      {options.hiddenRender}
      <Alert color="blue" variant="light">
        <Text size="sm">
          <Trans>
            Export this dashboard as a PDF, or sketch on it first. Annotations
            support text, arrows, and freehand drawing with adjustable roughness
            (RoughJS).
          </Trans>
        </Text>
      </Alert>
      {_getPdfExportActions(options)}
      <Group justify="flex-end">
        <Button variant="subtle" color="neutral" onClick={options.onClose}>
          <Trans>Cancel</Trans>
        </Button>
      </Group>
    </Stack>
  );
}

function _getPdfAnnotationStep(
  options: Readonly<PdfAnnotationStepOptions>,
): ReactNode {
  return (
    <Stack gap="sm">
      {options.hiddenRender}
      <PdfAnnotator
        sourceElement={options.sourceElement}
        filename={options.filename}
        title={options.title}
        onClose={options.onClose}
        onBack={options.onBack}
      />
    </Stack>
  );
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
  const onDirectExport = useDirectPdfExport({
    dashboard,
    filename: render.filename,
    onClose,
    renderContainerRef,
    setIsExporting,
  });
  const hiddenRender = _getHiddenDashboardRender({
    ...render,
    renderContainerRef,
  });
  return step === "choose" ?
      _getPdfExportChoice({
        hiddenRender,
        isExporting,
        onAnnotate: () => {
          setStep("annotate");
        },
        onClose,
        onDirectExport,
      })
    : _getPdfAnnotationStep({
        filename: render.filename,
        hiddenRender,
        onBack: () => {
          setStep("choose");
        },
        onClose,
        sourceElement: renderContainerRef.current ?? undefined,
        title: dashboard.name || t`Untitled dashboard`,
      });
}
