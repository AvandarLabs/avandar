import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactElement } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { getNuxWorkspaceArtifactsQueryKey } from "@/clients/NuxProgressClient/NuxProgressClient";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { DASHBOARD_TOOLBAR_BUTTON_SIZE } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.constants";

type Props = {
  workspaceSlug: string;
  dashboardId: Dashboard.Id | undefined;
};

type DeleteConfirmationCopy = {
  notLoaded: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
};

function useDeleteDashboard(
  options: Readonly<Props & { successMessage: string }>,
): {
  deleteDashboard: (options: Readonly<{ id: Dashboard.Id }>) => void;
  isDeleting: boolean;
} {
  const navigate = useNavigate();
  const [deleteDashboard, isDeleting] = DashboardClient.useFullDelete({
    queriesToInvalidate: options.dashboardId
      ? [
          DashboardClient.QueryKeys.getAll(),
          DashboardClient.QueryKeys.getById({ id: options.dashboardId }),
          getNuxWorkspaceArtifactsQueryKey(),
        ]
      : [getNuxWorkspaceArtifactsQueryKey()],
    onSuccess: async () => {
      if (options.dashboardId) {
        NuxEvents.emit("dashboard.deleted", {
          dashboardId: options.dashboardId,
        });
      }
      notifySuccess(options.successMessage);
      await navigate({
        to: "/$workspaceSlug/dashboards",
        params: { workspaceSlug: options.workspaceSlug },
      });
    },
  });
  return { deleteDashboard, isDeleting };
}

function _openDeleteConfirmation(
  options: Readonly<{
    dashboardId: Dashboard.Id | undefined;
    deleteDashboard: (options: Readonly<{ id: Dashboard.Id }>) => void;
    copy: DeleteConfirmationCopy;
  }>,
): void {
  if (!options.dashboardId) {
    notifyError({ message: options.copy.notLoaded });
    return;
  }
  const dashboardId = options.dashboardId;
  modals.openConfirmModal({
    title: options.copy.title,
    children: options.copy.body,
    labels: {
      confirm: options.copy.confirm,
      cancel: options.copy.cancel,
    },
    confirmProps: { color: "danger" },
    onConfirm: () => {
      options.deleteDashboard({ id: dashboardId });
    },
  });
}

/** Deletes the active dashboard after an irreversible-action confirmation. */
export function DeleteDashboardButton({
  workspaceSlug,
  dashboardId,
}: Readonly<Props>): ReactElement {
  const { t } = useLingui();
  const { deleteDashboard, isDeleting } = useDeleteDashboard({
    dashboardId,
    workspaceSlug,
    successMessage: t`Dashboard deleted successfully!`,
  });

  return (
    <Button
      size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
      variant="light"
      color="danger"
      leftSection={<IconTrash size={16} />}
      loading={isDeleting}
      disabled={!dashboardId}
      onClick={() => {
        _openDeleteConfirmation({
          dashboardId,
          deleteDashboard,
          copy: {
            notLoaded: t`Dashboard is not loaded yet.`,
            title: t`Delete dashboard?`,
            body: t`This cannot be undone.`,
            confirm: t`Delete`,
            cancel: t`Cancel`,
          },
        });
      }}
    >
      <Trans>Delete</Trans>
    </Button>
  );
}
