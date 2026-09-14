import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import { IconFileExport } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import rough from "roughjs";
import { drawPdfAnnotationStroke } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/drawPdfAnnotationStroke";
import { PdfAnnotationCanvas } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotationCanvas/PdfAnnotationCanvas";
import { PdfAnnotationToolbar } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotationToolbar";
import { useAnnotatedPdfExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/useAnnotatedPdfExport";
import { usePdfDashboardCapture } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/usePdfDashboardCapture";
import type {
  PdfAnnotationStroke,
  PdfAnnotationTool,
} from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotation";
import type { ReactNode } from "react";

type Props = {
  sourceElement: HTMLElement | undefined;
  filename: string;
  title: string;
  onClose: () => void;
  onBack: () => void;
  /** Called with the wall-clock duration after a successful export only. */
  onExported: (durationMs: number) => void;
};

const MAX_DISPLAY_WIDTH = 900;

/** Provides drawing and text annotations over a captured dashboard image. */
export function PdfAnnotator({
  sourceElement,
  filename,
  title,
  onClose,
  onBack,
  onExported,
}: Props): ReactNode {
  const { t } = useLingui();
  const { baseCanvas, isCapturing } = usePdfDashboardCapture(sourceElement);
  const [tool, setTool] = useState<PdfAnnotationTool>("freehand");
  const [color, setColor] = useState("#1e3a8a");
  const [roughness, setRoughness] = useState(1.5);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokes, setStrokes] = useState<readonly PdfAnnotationStroke[]>([]);

  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  // Current in-progress stroke (during a drag).
  const draftRef = useRef<PdfAnnotationStroke | null>(null);

  const { isExporting, exportPdf } = useAnnotatedPdfExport({
    sourceElement,
    overlayRef,
    filename,
    title,
    onClose,
    onExported,
  });

  // Derive display dimensions from the captured canvas.
  const displayWidth = baseCanvas
    ? Math.min(MAX_DISPLAY_WIDTH, baseCanvas.width / 2)
    : 800;
  const displayScale = baseCanvas ? displayWidth / baseCanvas.width : 1;
  const displayHeight = baseCanvas ? baseCanvas.height * displayScale : 600;

  // Render overlay strokes every time something changes.
  useEffect(
    function renderAnnotationStrokes() {
      if (!baseCanvas || !overlayRef.current) {
        return;
      }
      const overlay = overlayRef.current;
      overlay.width = baseCanvas.width;
      overlay.height = baseCanvas.height;
      const context = overlay.getContext("2d");
      if (!context) {
        return;
      }
      context.clearRect(0, 0, overlay.width, overlay.height);
      const roughCanvas = rough.canvas(overlay);
      strokes.forEach((stroke) => {
        drawPdfAnnotationStroke(context, roughCanvas, stroke);
      });
      if (draftRef.current) {
        drawPdfAnnotationStroke(context, roughCanvas, draftRef.current);
      }
    },
    [baseCanvas, strokes],
  );

  const _toCanvasCoord = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
      const rect = e.currentTarget.getBoundingClientRect();
      const cw = baseCanvas?.width ?? 0;
      const ch = baseCanvas?.height ?? 0;
      const x = ((e.clientX - rect.left) / rect.width) * cw;
      const y = ((e.clientY - rect.top) / rect.height) * ch;
      return [x, y];
    },
    [baseCanvas],
  );

  const _redrawDraft = useCallback((): void => {
    if (!overlayRef.current || !baseCanvas) {
      return;
    }
    const context = overlayRef.current.getContext("2d");
    if (!context) {
      return;
    }
    context.clearRect(
      0,
      0,
      overlayRef.current.width,
      overlayRef.current.height,
    );
    const roughCanvas = rough.canvas(overlayRef.current);
    strokes.forEach((stroke) => {
      drawPdfAnnotationStroke(context, roughCanvas, stroke);
    });
    if (draftRef.current) {
      drawPdfAnnotationStroke(context, roughCanvas, draftRef.current);
    }
  }, [baseCanvas, strokes]);

  const _handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!baseCanvas) {
        return;
      }
      const pt = _toCanvasCoord(e);
      const seed = Math.floor(Math.random() * 100000);
      if (tool === "freehand") {
        draftRef.current = {
          kind: "freehand",
          points: [pt],
          color,
          roughness,
          strokeWidth,
          seed,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        _redrawDraft();
      } else if (tool === "arrow") {
        draftRef.current = {
          kind: "arrow",
          from: pt,
          to: pt,
          color,
          roughness,
          strokeWidth,
          seed,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        _redrawDraft();
      } else if (tool === "text") {
        const text = window.prompt(t`Annotation text:`);
        if (!text) {
          return;
        }
        setStrokes((s) => {
          return [
            ...s,
            {
              kind: "text",
              at: pt,
              text,
              color,
              // Scale font with the captured canvas so it reads at PDF size.
              fontSize: Math.round((baseCanvas.width / displayWidth) * 18),
            },
          ];
        });
      }
    },
    [
      baseCanvas,
      color,
      displayWidth,
      roughness,
      strokeWidth,
      tool,
      t,
      _toCanvasCoord,
      _redrawDraft,
    ],
  );

  const _handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!draftRef.current) {
        return;
      }
      const pt = _toCanvasCoord(e);
      if (draftRef.current.kind === "freehand") {
        draftRef.current.points.push(pt);
      } else if (draftRef.current.kind === "arrow") {
        draftRef.current.to = pt;
      }
      _redrawDraft();
    },
    [_toCanvasCoord, _redrawDraft],
  );

  const _handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!draftRef.current) {
        return;
      }
      const finished = draftRef.current;
      draftRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setStrokes((s) => {
        return [...s, finished];
      });
    },
    [],
  );

  const _undo = useCallback((): void => {
    setStrokes((s) => {
      return s.slice(0, -1);
    });
  }, []);

  const _clear = useCallback((): void => {
    setStrokes([]);
  }, []);

  if (isCapturing) {
    return (
      <Stack align="center" py="xl">
        <Loader />
        <Text size="sm" c="dimmed">
          <Trans>Capturing dashboard…</Trans>
        </Text>
      </Stack>
    );
  }

  if (!baseCanvas) {
    return (
      <Stack align="center" py="xl">
        <Text size="sm" c="red">
          <Trans>Couldn't capture the dashboard for annotation.</Trans>
        </Text>
        <Button variant="subtle" onClick={onBack}>
          <Trans>Back</Trans>
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <PdfAnnotationToolbar
        tool={tool}
        color={color}
        roughness={roughness}
        strokeWidth={strokeWidth}
        hasStrokes={strokes.length > 0}
        onToolChange={setTool}
        onColorChange={setColor}
        onRoughnessChange={setRoughness}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={_undo}
        onClear={_clear}
      />

      <PdfAnnotationCanvas
        baseCanvas={baseCanvas}
        displayWidth={displayWidth}
        displayHeight={displayHeight}
        tool={tool}
        overlayRef={overlayRef}
        onPointerDown={_handlePointerDown}
        onPointerMove={_handlePointerMove}
        onPointerUp={_handlePointerUp}
      />

      <Group justify="space-between" mt="xs">
        <Button variant="subtle" color="neutral" onClick={onBack}>
          <Trans>← Back</Trans>
        </Button>
        <Group gap="xs">
          <Button variant="subtle" color="neutral" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            loading={isExporting}
            leftSection={<IconFileExport size={16} />}
            onClick={exportPdf}
          >
            <Trans>Export annotated PDF</Trans>
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
