import clsx from "clsx";
import { useMemo } from "react";
import css from "@/components/CanvasDrawer/CanvasDrawer.module.css";
import { CanvasDrawerBody } from "@/components/CanvasDrawer/CanvasDrawerBody/CanvasDrawerBody";
import { CanvasDrawerContext } from "@/components/CanvasDrawer/CanvasDrawerContext";
import { CanvasDrawerResizeHandle } from "@/components/CanvasDrawer/CanvasDrawerResizeHandle/CanvasDrawerResizeHandle";
import { useDrawerResize } from "@/components/CanvasDrawer/useDrawerResize/useDrawerResize";
import type { ReactNode, RefObject } from "react";

type Props = {
  /** Whether the collapsible body is expanded. */
  opened: boolean;

  /**
   * The canvas the drawer is docked beneath. Its height plus the drawer's
   * own is the region the two share, which is what caps the drag.
   */
  canvasRef: RefObject<HTMLElement | null>;

  /**
   * Keep the top border and surface when the body is shut. Use this when the
   * host keeps chrome (a tab rail) visible while collapsed.
   */
  keepChrome?: boolean;

  className?: string;
  children: ReactNode;
};

type CanvasDrawerComponent = ((props: Props) => ReactNode) & {
  Body: typeof CanvasDrawerBody;
  ResizeHandle: typeof CanvasDrawerResizeHandle;
};

function CanvasDrawerRoot({
  opened,
  canvasRef,
  keepChrome = false,
  className,
  children,
}: Props): ReactNode {
  const { height, maxHeight, onResizePointerDown, onResizeKeyDown } =
    useDrawerResize({ canvasRef });
  const value = useMemo(() => {
    return {
      opened,
      height,
      maxHeight,
      onResizePointerDown,
      onResizeKeyDown,
    };
  }, [opened, height, maxHeight, onResizePointerDown, onResizeKeyDown]);

  return (
    <CanvasDrawerContext.Provider value={value}>
      <div
        className={clsx(css.canvasDrawerRoot, className)}
        data-chrome={keepChrome || opened ? "true" : "false"}
      >
        {children}
      </div>
    </CanvasDrawerContext.Provider>
  );
}

/**
 * In-flow drawer docked under a canvas. Opening it takes height from the
 * sibling canvas rather than overlaying it, so canvas chrome stays visible
 * and sibling panels (chat, nav) stay uncovered.
 */
export const CanvasDrawer = CanvasDrawerRoot as CanvasDrawerComponent;
CanvasDrawer.Body = CanvasDrawerBody;
CanvasDrawer.ResizeHandle = CanvasDrawerResizeHandle;
