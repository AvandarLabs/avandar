import { useLingui } from "@lingui/react/macro";
import { Box, Loader, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import css from "./PdfPagePreview.module.css";
import type { BBox } from "@/workers/pdfSniff/pdfSniff.types";
import type { ReactNode } from "react";

/** One box drawn over the rendered page. */
export type Highlight = {
  /** In PDF points. */
  bbox: BBox;
  /** Drawn more prominently, for the region currently being reviewed. */
  isActive?: boolean;
};

type Props = {
  file: File;
  /** Zero-based. */
  pageIndex: number;
  /** Drawn over the rendered page, in PDF points. */
  highlights?: readonly Highlight[];
  /** Rendered width in CSS pixels; height follows the page aspect ratio. */
  width?: number;
  /** Rendered scale, reported so an overlay can map clicks back to points. */
  onScaleChange?: (scale: number) => void;
  /**
   * The page's unscaled size in PDF points, reported alongside the scale.
   *
   * An overlay cannot derive this from the scale: the scale only says how
   * many pixels one point became, so without the page's own height there is
   * nothing to flip the y axis against.
   */
  onPageSizeChange?: (size: { widthPt: number; heightPt: number }) => void;
};

/**
 * Renders a single PDF page to a canvas and outlines the selected regions.
 *
 * pdf.js (and the `loadPdfDocument` helper that wraps it) are imported
 * dynamically
 * so that bundle only loads when a user actually opens a PDF, rather than on
 * every visit to the data manager. This is also the reason
 * `GlobalWorkerOptions.workerSrc` is set here rather than reused from
 * elsewhere: `src/workers/pdfSniff/loadPdfDocument/loadPdfDocument.ts` never
 * has to set it, because it only ever runs inside `pdfSniff.worker.ts`, where
 * it registers pdf.js's message handler directly on the worker's `globalThis`
 * and pdf.js parses
 * in-process instead of spawning a nested worker. This component runs on the
 * main thread, where that registration does not happen, so pdf.js takes its
 * normal path of spawning a real Worker from `workerSrc` -- which throws if
 * unset.
 *
 * The highlights are painted onto the same canvas as the page, so changing
 * them re-renders the page. Callers should therefore keep `highlights` and
 * `onScaleChange` referentially stable, or every parent render re-parses the
 * document.
 */
export function PdfPagePreview({
  file,
  pageIndex,
  highlights,
  width = 320,
  onScaleChange,
  onPageSizeChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(
    function renderPdfPageToCanvas() {
      let isCancelled = false;

      const render = async (): Promise<void> => {
        setStatus("loading");
        try {
          const [pdfjs, { loadPdfDocument }] = await Promise.all([
            import("pdfjs-dist/legacy/build/pdf.mjs"),
            import("@/workers/pdfSniff/loadPdfDocument/loadPdfDocument"),
          ]);
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/legacy/build/pdf.worker.mjs",
            import.meta.url,
          ).href;

          const bytes = new Uint8Array(await file.arrayBuffer());
          const doc = await loadPdfDocument(bytes);

          const page = await doc.getPage(pageIndex + 1);
          const unscaled = page.getViewport({
            scale: 1,
            rotation: page.rotate,
          });
          const scale = width / unscaled.width;
          const viewport = page.getViewport({ scale, rotation: page.rotate });

          const canvas = canvasRef.current;
          if (isCancelled || !canvas) {
            await doc.destroy();
            return;
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          if (!context) {
            await doc.destroy();
            return;
          }

          await page.render({ canvas, canvasContext: context, viewport })
            .promise;

          for (const highlight of highlights ?? []) {
            // PDF y grows upward, canvas y grows downward, so the box has to
            // be flipped as well as scaled.
            const [x0, y0, x1, y1] = highlight.bbox;
            context.save();
            context.strokeStyle =
              highlight.isActive ?
                "rgba(34, 139, 230, 0.95)"
              : "rgba(34, 139, 230, 0.5)";
            context.fillStyle =
              highlight.isActive ?
                "rgba(34, 139, 230, 0.18)"
              : "rgba(34, 139, 230, 0.08)";
            context.lineWidth = highlight.isActive ? 2 : 1;
            const boxX = x0 * scale;
            const boxY = canvas.height - y1 * scale;
            const boxWidth = (x1 - x0) * scale;
            const boxHeight = (y1 - y0) * scale;
            context.fillRect(boxX, boxY, boxWidth, boxHeight);
            context.strokeRect(boxX, boxY, boxWidth, boxHeight);
            context.restore();
          }

          await doc.destroy();
          if (!isCancelled) {
            // Reported after rendering rather than before, so an overlay is
            // never told a scale for a page that has not been drawn.
            onScaleChange?.(scale);
            onPageSizeChange?.({
              widthPt: unscaled.width,
              heightPt: unscaled.height,
            });
            setStatus("ready");
          }
        } catch {
          if (!isCancelled) {
            setStatus("error");
          }
        }
      };

      void render();

      return () => {
        isCancelled = true;
      };
    },
    [file, pageIndex, highlights, width, onScaleChange, onPageSizeChange],
  );

  return (
    <Box pos="relative" w={width}>
      <canvas
        ref={canvasRef}
        className={css.canvas}
        aria-label={t`PDF page ${pageIndex + 1}`}
      />
      {status === "loading" ?
        <Loader size="sm" pos="absolute" top={8} left={8} />
      : null}
      {status === "error" ?
        <Text size="xs" c="dimmed">
          {t`Could not render this page.`}
        </Text>
      : null}
    </Box>
  );
}
