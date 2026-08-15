import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconShare } from "@tabler/icons-react";
import { useShareButtonState } from "@/components/permissions/useShareButtonState/useShareButtonState";
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
 * Opens the merged share and publish modal.
 *
 * This is the toolbar's only sharing control: the separate Publish button was
 * removed when publishing moved inside the modal, so a dashboard's audience is
 * chosen in exactly one place.
 *
 * It opens at `editor`, not `admin`: publishing to your own workspace is
 * ordinary editing work. The modal itself renders the sharing half read-only
 * for anyone below admin.
 *
 * The filled variant carries what the old Publish button's "Published" label
 * carried, so a draft is still distinguishable from a live dashboard without
 * opening the modal.
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
          const modalId = `share-dashboard-${dashboard.id}`;
          modals.open({
            modalId,
            title: t`Share`,
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
        }}
      >
        <Trans>Share</Trans>
      </Button>
    </Tooltip>
  );
}
