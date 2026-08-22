import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import { useCanvasDrawerContext } from "@/components/CanvasDrawer/CanvasDrawerContext";
import css from "@/components/CanvasDrawer/CanvasDrawerResizeHandle/CanvasDrawerResizeHandle.module.css";
import { DrawerHeight } from "@/components/CanvasDrawer/DrawerHeight/DrawerHeight";

/** Drag and keyboard separator that resizes an open canvas-docked drawer. */
export function CanvasDrawerResizeHandle(): ReactNode {
  const { t } = useLingui();
  const { opened, height, maxHeight, onResizePointerDown, onResizeKeyDown } =
    useCanvasDrawerContext();
  return opened ? (
    <div
      className={css.canvasDrawerResizeHandle}
      role="separator"
      aria-orientation="horizontal"
      aria-label={t`Resize drawer`}
      aria-valuenow={height}
      aria-valuemin={DrawerHeight.MIN_HEIGHT}
      aria-valuemax={maxHeight}
      tabIndex={0}
      onPointerDown={onResizePointerDown}
      onKeyDown={onResizeKeyDown}
    />
  ) : null;
}
