import type { BBox } from "@/workers/pdfSniff/pdfSniff.types";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

import { useLingui } from "@lingui/react/macro";
import { Box } from "@mantine/core";
import { useRef, useState } from "react";

import css from "./PdfRegionOverlay.module.css";

/** A drag shorter than this in either axis is a click, not a selection. */
const MIN_DRAG_PX = 4;

/** How the overlay turns pointer events into PDF-space geometry. */
export type OverlayInteraction = "draw" | "pick";

type PdfPoint = { x: number; y: number };

type Props = {
  width: number;
  height: number;
  /**
   * Layout pixels per PDF point, used only when the surface has not been laid
   * out. See {@link _pixelsPerPoint}.
   */
  scale: number;
  /** Page height in PDF points, needed to flip the y axis. */
  pageHeight: number;
  /** `draw` selects a region; `pick` reports a single click as a PDF point. */
  interaction?: OverlayInteraction;
  /** Points already chosen, in PDF space, drawn as markers. */
  markers?: readonly PdfPoint[];
  onRegionDrawn: (bbox: BBox) => void;
  onPointPicked?: (point: PdfPoint) => void;
};

type Mapping = {
  rect: DOMRect | undefined;
  pageHeight: number;
  fallbackScale: number;
};

/**
 * CSS pixels per PDF point, measured from the surface the user dragged on.
 *
 * The `scale` prop cannot answer this. It is the scale `PdfPagePreview` was
 * asked to LAY the page out at, which is neither what it drew the bitmap at
 * nor what the browser ended up showing. A pointer event reports CSS pixels,
 * and the two are not the same number here, because every size in this
 * preview goes through Mantine's `rem()` scaling. `--mantine-scale` is 0.9
 * between 1200 and 1408 CSS pixels of viewport and 0.8 below that (see
 * `src/index.css`), so a 420-point-wide preview is displayed 378 or 336
 * pixels wide. The bitmap is a third number again: `PdfPagePreview` draws it
 * at the device pixel ratio, so on a retina screen it is 840 pixels across.
 *
 * Dividing a pointer offset by that scale therefore reports a region
 * nobody drew. Measured in a real browser at `--mantine-scale: 0.9`, a box
 * dragged around the OCHA choropleth came back as [274, 489, 513, 638]
 * instead of the [305, 450, 570, 615] it covered on screen, which cuts six
 * states off the bottom of the map and silently extracts the wrong figures.
 *
 * Measuring the surface is right under that, under browser zoom, and under a
 * flex layout that squeezed the preview. The prop stays as the fallback for
 * an environment with no layout at all, where every rect is zero.
 */
function _pixelsPerPoint(options: Mapping): number {
  const measured = (options.rect?.height ?? 0) / options.pageHeight;
  return measured > 0 ? measured : options.fallbackScale;
}

function _cssToPdfPoint(local: PdfPoint, mapping: Mapping): PdfPoint {
  const pixelsPerPoint = _pixelsPerPoint(mapping);
  return {
    x: local.x / pixelsPerPoint,
    y: mapping.pageHeight - local.y / pixelsPerPoint,
  };
}

function _pdfToCss(point: PdfPoint, mapping: Mapping): PdfPoint {
  const pixelsPerPoint = _pixelsPerPoint(mapping);
  return {
    x: point.x * pixelsPerPoint,
    y: (mapping.pageHeight - point.y) * pixelsPerPoint,
  };
}

function _bboxFromDrag(start: PdfPoint, end: PdfPoint, mapping: Mapping): BBox {
  const startPdf = _cssToPdfPoint(start, mapping);
  const endPdf = _cssToPdfPoint(end, mapping);
  return [
    Math.min(startPdf.x, endPdf.x),
    Math.min(startPdf.y, endPdf.y),
    Math.max(startPdf.x, endPdf.x),
    Math.max(startPdf.y, endPdf.y),
  ];
}

function _isClick(start: PdfPoint, end: PdfPoint): boolean {
  return (
    Math.abs(end.x - start.x) < MIN_DRAG_PX ||
    Math.abs(end.y - start.y) < MIN_DRAG_PX
  );
}

/**
 * Transparent drag surface sitting over the rendered page.
 *
 * Owns exactly one thing: turning a pointer gesture into PDF points.
 * Keeping the coordinate flip here means no other component has to know that
 * PDF y grows upward while screen y grows downward, which is the single most
 * common source of off-by-a-page-height bugs in this feature.
 */
export function PdfRegionOverlay({
  width,
  height,
  scale,
  pageHeight,
  interaction = "draw",
  markers = [],
  onRegionDrawn,
  onPointPicked,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<PdfPoint | null>(null);
  const [preview, setPreview] = useState<null | {
    left: number;
    top: number;
    width: number;
    height: number;
  }>(null);

  const mapping = (): Mapping => {
    return {
      rect: surfaceRef.current?.getBoundingClientRect(),
      pageHeight,
      fallbackScale: scale,
    };
  };

  const localPoint = (event: ReactPointerEvent): PdfPoint => {
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
      className={css.surface}
      aria-label={
        interaction === "pick"
          ? t`Click a point on the axis`
          : t`Draw a region on the page`
      }
      onPointerDown={(event) => {
        startRef.current = localPoint(event);
        setPreview(null);
      }}
      onPointerMove={(event) => {
        const start = startRef.current;
        if (!start || interaction === "pick") {
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
        if (interaction === "pick") {
          if (_isClick(start, end)) {
            onPointPicked?.(_cssToPdfPoint(end, mapping()));
          }
          return;
        }
        if (_isClick(start, end)) {
          return;
        }
        onRegionDrawn(_bboxFromDrag(start, end, mapping()));
      }}
    >
      {preview ? (
        <Box
          pos="absolute"
          left={preview.left}
          top={preview.top}
          w={preview.width}
          h={preview.height}
          className={css.preview}
        />
      ) : null}
      {markers.map((point, index) => {
        const cssPoint = _pdfToCss(point, mapping());
        return (
          <Box
            key={`${point.x}-${point.y}-${index}`}
            pos="absolute"
            left={cssPoint.x}
            top={cssPoint.y}
            className={css.marker}
            data-testid="pdf-axis-marker"
          />
        );
      })}
    </Box>
  );
}
