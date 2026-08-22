import type { ReactNode, RefObject } from "react";

import { Box } from "@mantine/core";
import { Render as PuckPageRender } from "@puckeditor/core";

import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

type Props = {
  avaPageMetadata: ReturnType<typeof getAvaPageMetadataFromDashboard>;
  puckConfig: ReturnType<typeof useDashboardPuckConfig>;
  puckData: ReturnType<typeof upgradeAvaPageData>;
  renderContainerRef: RefObject<HTMLDivElement | null>;
};

/**
 * Renders the dashboard off-screen so html2canvas has something to capture.
 *
 * Always mounted rather than rendered per step, because the capture reads the
 * live DOM node. It uses `<PuckPageRender>` directly instead of the Puck
 * editor frame so no editor chrome lands in the snapshot, and it is fixed at a
 * letter-page width so the captured layout matches the exported PDF.
 */
export function HiddenDashboardRender({
  avaPageMetadata,
  puckConfig,
  puckData,
  renderContainerRef,
}: Readonly<Props>): ReactNode {
  return (
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
}
