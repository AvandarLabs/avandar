import { Box, Collapse } from "@mantine/core";
import css from "@/components/CanvasDrawer/CanvasDrawerBody/CanvasDrawerBody.module.css";
import { useCanvasDrawerContext } from "@/components/CanvasDrawer/CanvasDrawerContext";
import type { ReactNode } from "react";

/** Duration of the collapse and expand animation, in milliseconds. */
const COLLAPSE_DURATION_MS = 240;

type Props = {
  /** Id of the collapsible region, for `aria-controls` on a host toggle. */
  regionId: string;
  children: ReactNode;
};

/**
 * Collapsible body of a canvas-docked drawer. One long-lived `Collapse` keeps
 * the expand animation intact across host tab or content swaps.
 */
export function CanvasDrawerBody({ regionId, children }: Props): ReactNode {
  const { opened, height } = useCanvasDrawerContext();
  return (
    <Collapse
      id={regionId}
      expanded={opened}
      transitionDuration={COLLAPSE_DURATION_MS}
    >
      <Box className={css.canvasDrawerBody} style={{ height }}>
        {children}
      </Box>
    </Collapse>
  );
}
