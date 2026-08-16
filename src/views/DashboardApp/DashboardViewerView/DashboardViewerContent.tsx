import { Box } from "@mantine/core";
import { Render as PuckPageRender } from "@puckeditor/core";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { DashboardAccessDeniedView } from "@/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView/DashboardAccessDeniedView";
import { DashboardLoadErrorState } from "@/views/DashboardApp/DashboardViewerView/DashboardLoadErrorState";
import { DashboardLoadingState } from "@/views/DashboardApp/DashboardViewerView/DashboardLoadingState";
import { DashboardPreviewBanner } from "@/views/DashboardApp/DashboardViewerView/DashboardPreviewBanner/DashboardPreviewBanner";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  mode: "published" | "preview";
  workspaceSlug: string | undefined;
  canEdit: boolean;
  isLoadingDatasets: boolean;
  loadingDatasetsError: Error | undefined;
  config: ReturnType<typeof useDashboardPuckConfig>;
  data: ReturnType<typeof upgradeAvaPageData>;
  metadata: ReturnType<typeof getAvaPageMetadataFromDashboard> | undefined;
};

/**
 * Picks between the four things a viewer route can show: access denied,
 * loading, load failure, or the rendered page.
 *
 * Absent `metadata` means the access decision failed, not that data is still
 * arriving, so it is checked before the loading state.
 */
export function DashboardViewerContent({
  dashboard,
  mode,
  workspaceSlug,
  canEdit,
  isLoadingDatasets,
  loadingDatasetsError,
  config,
  data,
  metadata,
}: Readonly<Props>): ReactNode {
  if (!metadata) {
    return <DashboardAccessDeniedView />;
  }
  if (isLoadingDatasets) {
    return <DashboardLoadingState />;
  }
  if (loadingDatasetsError) {
    return <DashboardLoadErrorState />;
  }
  return (
    <DashboardFilterStateManager.Provider>
      <Box>
        {mode === "preview" && workspaceSlug ?
          <DashboardPreviewBanner
            dashboard={dashboard}
            workspaceSlug={workspaceSlug}
            canEdit={canEdit}
          />
        : null}
        <PuckPageRender config={config} data={data} metadata={metadata} />
      </Box>
    </DashboardFilterStateManager.Provider>
  );
}
