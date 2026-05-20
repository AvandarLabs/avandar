import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconFileExport } from "@tabler/icons-react";
import { notifyDevAlert, Tooltip } from "@ui";
import { logAnalyticsEvent } from "@/lib/analytics/analyticsClient";
import { ExportPdfModal } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/ExportPdfModal";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type Props = {
  dashboard: Dashboard.T | undefined;
  hasUnsavedChanges: boolean;
};

/**
 * Opens the Export-PDF modal where the user can either download a PDF
 * directly or annotate the rendered dashboard (text, arrows, freehand with
 * adjustable roughness via RoughJS) before exporting.
 *
 * Disabled while the dashboard isn't loaded or has unsaved edits — the
 * snapshot reads from the persisted dashboard config so unsaved tweaks
 * won't show up. The tooltip explains both states.
 */
export function ExportPdfButton({
  dashboard,
  hasUnsavedChanges,
}: Props): JSX.Element {
  const { t } = useLingui();
  const isDisabled = !dashboard || hasUnsavedChanges;

  return (
    <Tooltip
      label={t`Save your changes first — the PDF reflects the saved dashboard.`}
      disabled={!hasUnsavedChanges}
    >
      <Button
        variant="default"
        leftSection={<IconFileExport size={16} />}
        data-disabled={isDisabled || undefined}
        aria-disabled={isDisabled || undefined}
        onClick={(event) => {
          if (!dashboard) {
            event.preventDefault();
            notifyDevAlert("Dashboard is not loaded yet.");
            return;
          }
          if (hasUnsavedChanges) {
            event.preventDefault();
            return;
          }

          void logAnalyticsEvent({
            event: "dashboard.pdf_export_opened",
            workspaceId: dashboard.workspaceId,
            app: "dashboards",
            payload: { dashboardId: dashboard.id },
          });

          const modalId = modals.open({
            title: t`Export PDF`,
            size: "xl",
            children: (
              <ExportPdfModal
                dashboard={dashboard}
                onClose={() => {
                  modals.close(modalId);
                }}
              />
            ),
          });
        }}
      >
        <Trans>Export PDF</Trans>
      </Button>
    </Tooltip>
  );
}
