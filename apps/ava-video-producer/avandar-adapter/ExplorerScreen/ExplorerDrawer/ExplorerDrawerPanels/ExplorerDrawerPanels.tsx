import { Box } from "@mantine/core";
import drawerBodyCss from "@/components/CanvasDrawer/CanvasDrawerBody/CanvasDrawerBody.module.css";
import css from "./ExplorerDrawerPanels.module.css";
import type { ExplorerDrawerProps } from "../ExplorerDrawer.types";
import type { ReactNode } from "react";

type Props = Pick<ExplorerDrawerProps, "stage" | "drawerHeight"> & {
  children: ReactNode;
};

/**
 * The drawer's clipping and product body keep their original measured heights.
 */
export function ExplorerDrawerPanels({
  stage,
  drawerHeight,
  children,
}: Readonly<Props>): ReactNode {
  return (
    <div
      id="demo-explorer-drawer"
      className={css.explorerDrawerPanelsBody}
      style={{ height: drawerHeight * stage.drawerProgress }}
    >
      <Box
        className={drawerBodyCss.canvasDrawerBody}
        style={{ height: drawerHeight }}
      >
        {stage.drawerProgress > 0 ? children : null}
      </Box>
    </div>
  );
}
