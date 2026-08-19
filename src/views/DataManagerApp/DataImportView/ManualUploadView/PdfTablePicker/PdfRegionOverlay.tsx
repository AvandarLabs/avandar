import { Box } from "@mantine/core";
import { useRef, useState } from "react";
import type { BBox } from "@/workers/pdfSniff/types";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

/** A drag shorter than this in either axis is a click, not a selection. */
const MIN_DRAG_PX = 4;

type Props = {
  width: number;
  height: number;
  /**
   * Canvas pixels per PDF point, used only when the surface has not been laid
   * out. See {@link _pixelsPerPoint}.
   */
  scale: number;
  /** Page height in PDF points, needed to flip the y axis. */
  pageHeight: number;
  onRegionDrawn: (bbox: BBox) => void;
};

/**
 * CSS pixels per PDF point, measured from the surface the user dragged on.
 *
 * The `scale` prop cannot answer this. It is the canvas's own scale: how many
 * BITMAP pixels `PdfPagePreview` drew one point as. A pointer event reports
 * CSS pixels, and the two are not the same number here, because every size in
 * this preview goes through Mantine's `rem()` scaling. `--mantine-scale` is
 * 0.9 between 1200 and 1408 CSS pixels of viewport and 0.8 below that (see
 * `src/index.css`), so a 420-point-wide preview is displayed 378 or 336
 * pixels wide while its bitmap stays 420.
 *
 * Dividing a pointer offset by the bitmap scale therefore reports a region
 * nobody drew. Measured in a real browser at `--mantine-scale: 0.9`, a box
 * dragged around the OCHA choropleth came back as [274, 489, 513, 638]
 * instead of the [305, 450, 570, 615] it covered on screen, which cuts six
 * states off the bottom of the map and silently extracts the wrong figures.
 *
 * Measuring the surface is right under that, under browser zoom, and under a
 * flex layout that squeezed the preview. The prop stays as the fallback for
 * an environment with no layout at all, where every rect is zero.
 */
function _pixelsPerPoint(options: {
  rect: DOMRect | undefined;
  pageHeight: number;
  fallbackScale: number;
}): number {
  const measured = (options.rect?.height ?? 0) / options.pageHeight;
  return measured > 0 ? measured : options.fallbackScale;
}

/**
 * Transparent drag surface sitting over the rendered page.
 *
 * Owns exactly one thing: turning a pointer drag into a bbox in PDF points.
 * Keeping the coordinate flip here means no other component has to know that
 * PDF y grows upward while screen y grows downward, which is the single most
 * common source of off-by-a-page-height bugs in this feature.
 */
export function PdfRegionOverlay({
  width,
  height,
  scale,
  pageHeight,
  onRegionDrawn,
}: Readonly<Props>): ReactNode {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<null | {
    left: number;
    top: number;
    width: number;
    height: number;
  }>(null);

  const localPoint = (event: ReactPointerEvent): { x: number; y: number } => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  return (
    <Box
      ref={surfaceRef}
      data-testid="pdf-region-overlay"
      pos="absolute"
      top={0}
      left={0}
      w={width}
      h={height}
      style={{ cursor: "crosshair", touchAction: "none" }}
      onPointerDown={(event) => {
        startRef.current = localPoint(event);
        setPreview(null);
      }}
      onPointerMove={(event) => {
        const start = startRef.current;
        if (!start) {
          return;
        }
        const current = localPoint(event);
        setPreview({
          left: Math.min(start.x, current.x),
          top: Math.min(start.y, current.y),
          width: Math.abs(current.x - start.x),
          height: Math.abs(current.y - start.y),
        });
      }}
      onPointerUp={(event) => {
        const start = startRef.current;
        startRef.current = null;
        setPreview(null);
        if (!start) {
          return;
        }
        const end = localPoint(event);
        if (
          Math.abs(end.x - start.x) < MIN_DRAG_PX ||
          Math.abs(end.y - start.y) < MIN_DRAG_PX
        ) {
          return;
        }

        // Screen pixels to PDF points, with y flipped. Normalised so a box
        // dragged up and to the left still reads x0 < x1 and y0 < y1.
        const pixelsPerPoint = _pixelsPerPoint({
          rect: surfaceRef.current?.getBoundingClientRect(),
          pageHeight,
          fallbackScale: scale,
        });
        const toPoints = (px: number): number => {
          return px / pixelsPerPoint;
        };
        const x0 = toPoints(Math.min(start.x, end.x));
        const x1 = toPoints(Math.max(start.x, end.x));
        const y0 = pageHeight - toPoints(Math.max(start.y, end.y));
        const y1 = pageHeight - toPoints(Math.min(start.y, end.y));

        onRegionDrawn([x0, y0, x1, y1]);
      }}
    >
      {preview && (
        <Box
          pos="absolute"
          left={preview.left}
          top={preview.top}
          w={preview.width}
          h={preview.height}
          style={{
            border: "2px dashed var(--mantine-color-blue-6)",
            background: "rgba(34, 139, 230, 0.12)",
            pointerEvents: "none",
          }}
        />
      )}
    </Box>
  );
}
