import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconShare } from "@tabler/icons-react";
import { nuxAnchorProps, NuxAnchors } from "@/components/Nux/nuxAnchors";
import { useShareButtonState } from "@/components/permissions/useShareButtonState";
import { DashboardShareModal } from "@/views/DashboardApp/DashboardShareModal/DashboardShareModal";
import type { ButtonProps } from "@mantine/core";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T | undefined;
  hasUnsavedChanges: boolean;
  size?: ButtonProps["size"];
};

/**
 * Opens the merged share and publish modal for one dashboard.
 *
 * The modal id is derived from the dashboard id so a second click on the same
 * button reuses the open modal instead of stacking another copy on top of it.
 *
 * @param options.title Localised, because a module-level helper cannot call
 *   `useLingui`.
 */
function _openDashboardShareModal(
  options: Readonly<{
    dashboard: Dashboard.T;
    hasUnsavedChanges: boolean;
    title: string;
  }>,
): void {
  const { dashboard, hasUnsavedChanges, title } = options;
  const modalId = `share-dashboard-${dashboard.id}`;
  modals.open({
    modalId,
    title,
    size: "lg",
    children: (
      <DashboardShareModal
        dashboard={dashboard}
        hasUnsavedChanges={hasUnsavedChanges}
        onClose={() => {
          modals.close(modalId);
        }}
      />
    ),
  });
}

/**
 * Opens the merged share and publish modal.
 *
 * This is the toolbar's only sharing control: publishing lives inside the
 * modal, so a dashboard's audience is chosen in exactly one place.
 *
 * It opens at `editor`, not `admin`: publishing to your own workspace is
 * ordinary editing work. The modal itself renders the sharing half read-only
 * for anyone below admin.
 *
 * The filled variant signals that the dashboard is published, so a draft is
 * distinguishable from a live dashboard without opening the modal.
 */
export function DashboardShareButton({
  dashboard,
  hasUnsavedChanges,
  size,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { isDisabled, tooltip } = useShareButtonState({
    resourceType: "dashboard",
    resourceId: dashboard?.id,
    minRole: "editor",
  });
  const isPublished =
    dashboard !== undefined && dashboard.visibility !== "draft";
  return (
    <Tooltip label={tooltip}>
      <Button
        {...nuxAnchorProps(NuxAnchors.dashboardShareButton)}
        size={size}
        variant={isPublished ? "filled" : "default"}
        color={
          isPublished ?
            dashboard.visibility === "public" ?
              "orange"
            : "teal"
          : undefined
        }
        leftSection={<IconShare size={16} />}
        data-disabled={isDisabled || undefined}
        aria-disabled={isDisabled || undefined}
        onClick={(event) => {
          if (!dashboard || isDisabled) {
            event.preventDefault();
            return;
          }
          const resourceName = dashboard.name;
          _openDashboardShareModal({
            dashboard,
            hasUnsavedChanges,
            title: t`Share “${resourceName}”`,
          });
        }}
      >
        <Trans>Share</Trans>
      </Button>
    </Tooltip>
  );
}
