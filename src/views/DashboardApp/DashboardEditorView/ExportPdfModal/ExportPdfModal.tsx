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
import { captureAndDownloadPdf } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/pdfExport";
import { getDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/getDashboardPuckConfig";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type Props = {
  dashboard: Dashboard.T;
  onClose: () => void;
};

type Step = "choose" | "snapshot" | "annotate";

/**
 * Two-step PDF export flow:
 *
 *   1. "choose" — pick between immediate export or annotation-then-export.
 *   2a. "snapshot" — capture the rendered dashboard once and let the user
 *       download it as a PDF directly.
 *   2b. "annotate" — same snapshot but mounted into PdfAnnotator so the
 *       user can layer text, arrows, and freehand strokes (with adjustable
 *       roughness) before exporting.
 *
 * The capture itself renders the dashboard in an off-screen DOM container
 * using `<PuckPageRender>` directly (not the Puck editor frame), so the
 * editor chrome doesn't show up in the snapshot.
 */
export function ExportPdfModal({ dashboard, onClose }: Props): JSX.Element {
  const [step, setStep] = useState<Step>("choose");
  const renderContainerRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const puckConfig = useMemo(() => {
    return getDashboardPuckConfig({
      dashboardTitle: dashboard.name,
      workspaceId: dashboard.workspaceId,
      dashboardId: dashboard.id,
    });
  }, [dashboard]);

  const puckData = useMemo(() => {
    const cfg = dashboard.config as unknown as AvaPageGenericData;
    const data = {
      ...cfg,
      root: {
        ...cfg.root,
        props: {
          ...cfg.root.props,
          title: dashboard.name || "Untitled dashboard",
          schemaVersion: getVersionFromAvaPageData(cfg),
        },
      },
    };
    return upgradeAvaPageData(data);
  }, [dashboard]);

  const avaPageMetadata = useMemo(() => {
    return getAvaPageMetadataFromDashboard(dashboard);
  }, [dashboard]);

  const filename = useMemo(() => {
    const base = (dashboard.name || "dashboard")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${base || "dashboard"}.pdf`;
  }, [dashboard.name]);

  const handleDirectExport = useCallback(async (): Promise<void> => {
    if (!renderContainerRef.current) {
      notifyError({ title: "Dashboard not ready", message: "Try again." });
      return;
    }
    setIsExporting(true);
    try {
      await captureAndDownloadPdf({
        element: renderContainerRef.current,
        filename,
        title: dashboard.name || "Untitled dashboard",
      });
      notifySuccess("PDF downloaded.");
      onClose();
    } catch (e: unknown) {
      notifyError({
        title: "Couldn't export PDF",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsExporting(false);
    }
  }, [filename, dashboard.name, onClose]);

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
            Export this dashboard as a PDF, or sketch on it first. Annotations
            support text, arrows, and freehand drawing with adjustable roughness
            (RoughJS).
          </Text>
        </Alert>

        <Stack gap="sm">
          <Button
            size="md"
            variant="outline"
            leftSection={<IconFileExport size={18} />}
            rightSection={<IconArrowRight size={16} />}
            loading={isExporting}
            onClick={handleDirectExport}
            justify="space-between"
          >
            Export as PDF
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
            Annotate, then export
          </Button>
        </Stack>

        <Group justify="flex-end">
          <Button variant="subtle" color="neutral" onClick={onClose}>
            Cancel
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
        sourceElement={renderContainerRef.current}
        filename={filename}
        title={dashboard.name || "Untitled dashboard"}
        onClose={onClose}
        onBack={() => {
          return setStep("choose");
        }}
      />
    </Stack>
  );
}
