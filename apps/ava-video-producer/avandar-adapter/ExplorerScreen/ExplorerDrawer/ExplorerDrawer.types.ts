import type { explorerStage } from "../explorerStage";
import type { CanvasDrawerContext } from "@/components/CanvasDrawer/CanvasDrawerContext";
import type { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import type { ComponentProps, ReactNode } from "react";

/** Frame-owned state shared by the native drawer's panels and rail. */
export type ExplorerDrawerProps = {
  stage: ReturnType<typeof explorerStage>;
  drawerHeight: number;
  context: ComponentProps<typeof CanvasDrawerContext.Provider>["value"];
  manualGroups: ComponentProps<typeof SettingsColumns>["groups"];
  sqlEditor: ReactNode;
};
