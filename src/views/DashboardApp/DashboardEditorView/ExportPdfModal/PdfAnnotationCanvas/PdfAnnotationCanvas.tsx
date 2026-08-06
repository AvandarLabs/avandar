import { useLingui } from "@lingui/react/macro";
import { Box, Paper } from "@mantine/core";
import css from "./PdfAnnotationCanvas.module.css";
import type { PdfAnnotationTool } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotation";
import type { PointerEventHandler, ReactNode, RefObject } from "react";

type Props = {
  baseCanvas: HTMLCanvasElement;
  displayWidth: number;
  displayHeight: number;
  tool: PdfAnnotationTool;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerUp: PointerEventHandler<HTMLCanvasElement>;
};

/** Renders the dashboard snapshot and its interactive annotation overlay. */
export function PdfAnnotationCanvas({
  baseCanvas,
  displayWidth,
  displayHeight,
  tool,
  overlayRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <Paper withBorder radius="sm" className={css.pdfAnnotationCanvasFrame}>
      <Box
        pos="relative"
        className={css.pdfAnnotationCanvasContainer}
        style={{ width: displayWidth, height: displayHeight }}
      >
        <img
          src={baseCanvas.toDataURL()}
          alt={t`Dashboard snapshot`}
          className={css.pdfAnnotationCanvasSnapshot}
          draggable={false}
        />
        <canvas
          ref={overlayRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={css.pdfAnnotationCanvasOverlay}
          style={{ cursor: tool === "text" ? "text" : "crosshair" }}
        />
      </Box>
    </Paper>
  );
}
