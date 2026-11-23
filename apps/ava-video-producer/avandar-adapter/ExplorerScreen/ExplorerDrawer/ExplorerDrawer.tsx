import drawerCss from "@/components/CanvasDrawer/CanvasDrawer.module.css";
import { CanvasDrawerContext } from "@/components/CanvasDrawer/CanvasDrawerContext";
import { CanvasDrawerResizeHandle } from "@/components/CanvasDrawer/CanvasDrawerResizeHandle/CanvasDrawerResizeHandle";
import { ExplorerDrawerTabs } from "./ExplorerDrawerTabs";
import type { ExplorerDrawerProps } from "./ExplorerDrawer.types";
import type { ReactNode } from "react";

type Props = ExplorerDrawerProps;

/** The native drawer shares one frame-owned resize and open-state context. */
export function ExplorerDrawer({
  context,
  ...panels
}: Readonly<Props>): ReactNode {
  return (
    <CanvasDrawerContext.Provider value={context}>
      <div className={drawerCss.canvasDrawerRoot} data-chrome="true">
        <CanvasDrawerResizeHandle />
        <ExplorerDrawerTabs {...panels} />
      </div>
    </CanvasDrawerContext.Provider>
  );
}
