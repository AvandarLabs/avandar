import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  Divider,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconArrowBack,
  IconArrowRight,
  IconClearAll,
  IconFileExport,
  IconPencil,
  IconTypography,
} from "@tabler/icons-react";
import { notifyError } from "@ui";
import { useCallback, useEffect, useRef, useState } from "react";
import rough from "roughjs";
import { snapshotElement, captureAndDownloadPdf } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/pdfExport";

type Tool = "freehand" | "arrow" | "text";

type Stroke =
  | {
      kind: "freehand";
      points: Array<[number, number]>;
      color: string;
      roughness: number;
      strokeWidth: number;
      seed: number;
    }
  | {
      kind: "arrow";
      from: [number, number];
      to: [number, number];
      color: string;
      roughness: number;
      strokeWidth: number;
      seed: number;
    }
  | {
      kind: "text";
      at: [number, number];
      text: string;
      color: string;
      fontSize: number;
    };

type Props = {
  sourceElement: HTMLElement | null;
  filename: string;
  title: string;
  onClose: () => void;
  onBack: () => void;
};

const MAX_DISPLAY_WIDTH = 900;

export function PdfAnnotator({
  sourceElement,
  filename,
  title,
  onClose,
  onBack,
}: Props): JSX.Element {
  const [baseCanvas, setBaseCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [tool, setTool] = useState<Tool>("freehand");
  const [color, setColor] = useState("#1e3a8a");
  const [roughness, setRoughness] = useState(1.5);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokes, setStrokes] = useState<readonly Stroke[]>([]);

  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const baseImgRef = useRef<HTMLCanvasElement | null>(null);
  // Current in-progress stroke (during a drag).
  const draftRef = useRef<Stroke | null>(null);

  // Capture the dashboard once on mount.
  useEffect(() => {
    let isMounted = true;
    if (!sourceElement) {
      setIsCapturing(false);
      return;
    }
    void snapshotElement(sourceElement).then((canvas) => {
      if (!isMounted) return;
      setBaseCanvas(canvas);
      setIsCapturing(false);
    }).catch((e: unknown) => {
      if (!isMounted) return;
      notifyError({
        title: "Couldn't capture dashboard",
        message: e instanceof Error ? e.message : String(e),
      });
      setIsCapturing(false);
    });
    return () => {
      isMounted = false;
    };
  }, [sourceElement]);

  // Derive display dimensions from the captured canvas.
  const displayWidth =
    baseCanvas ? Math.min(MAX_DISPLAY_WIDTH, baseCanvas.width / 2) : 800;
  const displayScale = baseCanvas ? displayWidth / baseCanvas.width : 1;
  const displayHeight = baseCanvas ? baseCanvas.height * displayScale : 600;

  // Render overlay strokes every time something changes.
  useEffect(() => {
    if (!baseCanvas || !overlayRef.current) return;
    const overlay = overlayRef.current;
    overlay.width = baseCanvas.width;
    overlay.height = baseCanvas.height;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const rc = rough.canvas(overlay);
    for (const s of strokes) {
      drawStroke(ctx, rc, s);
    }
    if (draftRef.current) {
      drawStroke(ctx, rc, draftRef.current);
    }
  }, [baseCanvas, strokes]);

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
    if (!overlayRef.current || !baseCanvas) return;
    const ctx = overlayRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    const rc = rough.canvas(overlayRef.current);
    for (const s of strokes) drawStroke(ctx, rc, s);
    if (draftRef.current) drawStroke(ctx, rc, draftRef.current);
  }, [baseCanvas, strokes]);

  const _handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!baseCanvas) return;
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
        const text = window.prompt("Annotation text:");
        if (!text) return;
        setStrokes((s) => {return [
          ...s,
          {
            kind: "text",
            at: pt,
            text,
            color,
            // Scale font with the captured canvas so it reads at PDF size.
            fontSize: Math.round((baseCanvas.width / displayWidth) * 18),
          },
        ]});
      }
    },
    [
      baseCanvas,
      color,
      displayWidth,
      roughness,
      strokeWidth,
      tool,
      _toCanvasCoord,
      _redrawDraft,
    ],
  );

  const _handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!draftRef.current) return;
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
      if (!draftRef.current) return;
      const finished = draftRef.current;
      draftRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setStrokes((s) => {return [...s, finished]});
    },
    [],
  );

  const _undo = useCallback((): void => {
    setStrokes((s) => {return s.slice(0, -1)});
  }, []);

  const _clear = useCallback((): void => {
    setStrokes([]);
  }, []);

  const _export = useCallback(async (): Promise<void> => {
    if (!sourceElement || !overlayRef.current) return;
    setIsExporting(true);
    try {
      await captureAndDownloadPdf({
        element: sourceElement,
        annotationCanvas: overlayRef.current,
        filename,
        title,
      });
      onClose();
    } catch (e: unknown) {
      notifyError({
        title: "Couldn't export PDF",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsExporting(false);
    }
  }, [filename, onClose, sourceElement, title]);

  if (isCapturing) {
    return (
      <Stack align="center" py="xl">
        <Loader />
        <Text size="sm" c="dimmed">
          Capturing dashboard…
        </Text>
      </Stack>
    );
  }

  if (!baseCanvas) {
    return (
      <Stack align="center" py="xl">
        <Text size="sm" c="red">
          Couldn't capture the dashboard for annotation.
        </Text>
        <Button variant="subtle" onClick={onBack}>
          Back
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Group gap="md" wrap="wrap" align="end">
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Tool
          </Text>
          <SegmentedControl
            size="xs"
            value={tool}
            onChange={(t) => {return setTool(t as Tool)}}
            data={[
              {
                value: "freehand",
                label: (
                  <Group gap={4}>
                    <IconPencil size={14} />
                    <span>Freehand</span>
                  </Group>
                ),
              },
              {
                value: "arrow",
                label: (
                  <Group gap={4}>
                    <IconArrowRight size={14} />
                    <span>Arrow</span>
                  </Group>
                ),
              },
              {
                value: "text",
                label: (
                  <Group gap={4}>
                    <IconTypography size={14} />
                    <span>Text</span>
                  </Group>
                ),
              },
            ]}
          />
        </Stack>

        <Stack gap={2} miw={180}>
          <Text size="xs" c="dimmed">
            Roughness ({roughness.toFixed(1)})
          </Text>
          <Slider
            size="xs"
            min={0}
            max={4}
            step={0.1}
            value={roughness}
            onChange={setRoughness}
            marks={[
              { value: 0, label: "Formal" },
              { value: 2, label: "Sketch" },
              { value: 4, label: "Loose" },
            ]}
          />
        </Stack>

        <Stack gap={2} miw={140}>
          <Text size="xs" c="dimmed">
            Stroke ({strokeWidth}px)
          </Text>
          <Slider
            size="xs"
            min={1}
            max={8}
            step={1}
            value={strokeWidth}
            onChange={setStrokeWidth}
          />
        </Stack>

        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            Color
          </Text>
          <ColorInput
            size="xs"
            value={color}
            onChange={setColor}
            withEyeDropper={false}
            format="hex"
            swatches={[
              "#1e3a8a",
              "#dc2626",
              "#16a34a",
              "#f59e0b",
              "#0ea5e9",
              "#000000",
            ]}
            style={{ width: 140 }}
          />
        </Stack>

        <Divider orientation="vertical" />

        <Group gap={4}>
          <ActionIcon
            variant="subtle"
            onClick={_undo}
            disabled={strokes.length === 0}
            aria-label="Undo"
          >
            <IconArrowBack size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={_clear}
            disabled={strokes.length === 0}
            aria-label="Clear all"
          >
            <IconClearAll size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <Paper
        withBorder
        radius="sm"
        style={{ overflow: "hidden", background: "#fff" }}
      >
        <Box
          pos="relative"
          style={{
            width: displayWidth,
            height: displayHeight,
            margin: "0 auto",
          }}
        >
          <img
            src={baseCanvas.toDataURL()}
            alt="Dashboard snapshot"
            ref={(el) => {
              // Keep the same width as the overlay so coords line up.
              if (el) {
                el.style.width = "100%";
                el.style.height = "100%";
                el.style.display = "block";
              }
            }}
            draggable={false}
          />
          <canvas
            ref={overlayRef}
            onPointerDown={_handlePointerDown}
            onPointerMove={_handlePointerMove}
            onPointerUp={_handlePointerUp}
            onPointerCancel={_handlePointerUp}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              cursor:
                tool === "text" ? "text"
                : tool === "arrow" ? "crosshair"
                : "crosshair",
              touchAction: "none",
            }}
          />
          {/* Stash the base for compositing in export. Off-screen. */}
          <canvas
            ref={baseImgRef}
            style={{ display: "none" }}
            width={baseCanvas.width}
            height={baseCanvas.height}
          />
        </Box>
      </Paper>

      <Group justify="space-between" mt="xs">
        <Button variant="subtle" color="neutral" onClick={onBack}>
          ← Back
        </Button>
        <Group gap="xs">
          <Button variant="subtle" color="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={isExporting}
            leftSection={<IconFileExport size={16} />}
            onClick={_export}
          >
            Export annotated PDF
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  s: Stroke,
): void {
  if (s.kind === "text") {
    ctx.save();
    ctx.fillStyle = s.color;
    ctx.font = `${s.fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(s.text, s.at[0], s.at[1]);
    ctx.restore();
    return;
  }
  if (s.kind === "freehand") {
    if (s.points.length < 2) return;
    rc.curve(s.points as Array<[number, number]>, {
      stroke: s.color,
      strokeWidth: s.strokeWidth,
      roughness: s.roughness,
      seed: s.seed,
      bowing: s.roughness === 0 ? 0 : 1,
    });
    return;
  }
  // arrow
  rc.line(s.from[0], s.from[1], s.to[0], s.to[1], {
    stroke: s.color,
    strokeWidth: s.strokeWidth,
    roughness: s.roughness,
    seed: s.seed,
  });
  // arrowhead
  const angle = Math.atan2(s.to[1] - s.from[1], s.to[0] - s.from[0]);
  const headLen = 14 + s.strokeWidth * 2;
  const headAngle = Math.PI / 6;
  const a1: [number, number] = [
    s.to[0] - headLen * Math.cos(angle - headAngle),
    s.to[1] - headLen * Math.sin(angle - headAngle),
  ];
  const a2: [number, number] = [
    s.to[0] - headLen * Math.cos(angle + headAngle),
    s.to[1] - headLen * Math.sin(angle + headAngle),
  ];
  rc.line(s.to[0], s.to[1], a1[0], a1[1], {
    stroke: s.color,
    strokeWidth: s.strokeWidth,
    roughness: s.roughness,
    seed: s.seed + 1,
  });
  rc.line(s.to[0], s.to[1], a2[0], a2[1], {
    stroke: s.color,
    strokeWidth: s.strokeWidth,
    roughness: s.roughness,
    seed: s.seed + 2,
  });
}
