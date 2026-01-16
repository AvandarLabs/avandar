import { Button } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { DashboardId } from "@/models/Dashboard/Dashboard.types";

type Props = {
  workspaceSlug: string;
  dashboardId: DashboardId | undefined;
};

export function ViewDashboardButton({
  workspaceSlug,
  dashboardId,
}: Props): JSX.Element {
  const navigate = useNavigate();

  return (
    <Button
      variant="light"
      leftSection={<IconEye size={16} />}
      disabled={!dashboardId}
      onClick={() => {
        if (!dashboardId) {
          return;
        }

        navigate({
          to: "/public/dashboards/$workspaceSlug/$dashboardId",
          params: { workspaceSlug, dashboardId },
        });
      }}
    >
      View
    </Button>
  );
}
