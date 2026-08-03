import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Box, Button, Group, Stack, Text } from "@mantine/core";
import { Render as PuckPageRender } from "@puckeditor/core";
import {
  IconArrowRight,
  IconFileExport,
  IconPencil,
} from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@ui";
import { useCallback, useMemo, useRef, useState } from "react";
import { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { PdfAnnotator } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotator";
import { PdfExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfExport";
import { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  onClose: () => void;
};

type Step = "choose" | "snapshot" | "annotate";

function buildPdfFilenameFromDashboardName(dashboardName: string): string {
  const filenameBase = (dashboardName || "dashboard")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return `${filenameBase || "dashboard"}.pdf`;
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
export function ExportPdfModal({ dashboard, onClose }: Props): ReactNode {
  const { t } = useLingui();
  const [step, setStep] = useState<Step>("choose");
  const renderContainerRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const puckConfig = useDashboardPuckConfig({
    dashboardTitle: dashboard.name,
    workspaceId: dashboard.workspaceId,
    dashboardId: dashboard.id,
    t,
  });

  const puckData = useMemo(() => {
    const cfg = dashboard.config as unknown as AvaPageGenericData;
    const data = {
      ...cfg,
      root: {
        ...cfg.root,
        props: {
          ...cfg.root.props,
          title: dashboard.name || t`Untitled dashboard`,
          schemaVersion: getVersionFromAvaPageData(cfg),
        },
      },
    };
    return upgradeAvaPageData(data);
  }, [dashboard, t]);

  const avaPageMetadata = useMemo(() => {
    return getAvaPageMetadataFromDashboard(dashboard);
  }, [dashboard]);

  const filename = buildPdfFilenameFromDashboardName(dashboard.name);

  const onDirectExport = useCallback(async (): Promise<void> => {
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
  }, [filename, dashboard.name, onClose, t]);

  // Always-mounted hidden render container so html2canvas can capture from
  // it. Positioned off-screen but at a fixed width so the layout matches a
  // standard letter-size PDF page.
  const hiddenRender = (
    <Box
      ref={renderContainerRef}
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
          config={puckConfig}
          data={puckData}
          metadata={avaPageMetadata}
        />
      </DashboardFilterStateManager.Provider>
    </Box>
  );

  if (step === "choose") {
    return (
      <Stack gap="md">
        {hiddenRender}
        <Alert color="blue" variant="light">
          <Text size="sm">
            <Trans>
              Export this dashboard as a PDF, or sketch on it first. Annotations
              support text, arrows, and freehand drawing with adjustable
              roughness (RoughJS).
            </Trans>
          </Text>
        </Alert>

        <Stack gap="sm">
          <Button
            size="md"
            variant="outline"
            leftSection={<IconFileExport size={18} />}
            rightSection={<IconArrowRight size={16} />}
            loading={isExporting}
            onClick={onDirectExport}
            justify="space-between"
          >
            <Trans>Export as PDF</Trans>
          </Button>
          <Button
            size="md"
            leftSection={<IconPencil size={18} />}
            rightSection={<IconArrowRight size={16} />}
            onClick={() => {
              return setStep("annotate");
            }}
            justify="space-between"
          >
            <Trans>Annotate, then export</Trans>
          </Button>
        </Stack>

        <Group justify="flex-end">
          <Button variant="subtle" color="neutral" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
        </Group>
      </Stack>
    );
  }

  // Annotate step
  return (
    <Stack gap="sm">
      {hiddenRender}
      <PdfAnnotator
        sourceElement={renderContainerRef.current ?? undefined}
        filename={filename}
        title={dashboard.name || t`Untitled dashboard`}
        onClose={onClose}
        onBack={() => {
          return setStep("choose");
        }}
      />
    </Stack>
  );
}
