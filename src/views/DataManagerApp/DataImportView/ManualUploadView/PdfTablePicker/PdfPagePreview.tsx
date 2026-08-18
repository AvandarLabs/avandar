import { Box, Loader, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type { BBox } from "@/workers/pdfSniff/types";

type Props = {
  file: File;
  /** Zero-based. */
  pageIndex: number;
  /** Drawn over the rendered page, in PDF points. */
  highlight: BBox | undefined;
  /** Rendered width in CSS pixels; height follows the page aspect ratio. */
  width?: number;
};

/**
 * Renders a single PDF page to a canvas and outlines the detected table.
 *
 * pdf.js (and the `loadPdfJs` helper that wraps it) are imported dynamically
 * so that bundle only loads when a user actually opens a PDF, rather than on
 * every visit to the data manager. This is also the reason
 * `GlobalWorkerOptions.workerSrc` is set here rather than reused from
 * elsewhere: `src/workers/pdfSniff/loadPdfJs.ts` never has to set it, because
 * it only ever runs inside `pdfSniff.worker.ts`, where it registers pdf.js's
 * message handler directly on the worker's `globalThis` and pdf.js parses
 * in-process instead of spawning a nested worker. This component runs on the
 * main thread, where that registration does not happen, so pdf.js takes its
 * normal path of spawning a real Worker from `workerSrc` -- which throws if
 * unset.
 */
export function PdfPagePreview({
  file,
  pageIndex,
  highlight,
  width = 320,
}: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let isCancelled = false;

    const render = async (): Promise<void> => {
      setStatus("loading");
      try {
        const [pdfjs, { loadPdfDocument }] = await Promise.all([
          import("pdfjs-dist/legacy/build/pdf.mjs"),
          import("@/workers/pdfSniff/loadPdfJs"),
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

        await page.render({ canvas, canvasContext: context, viewport }).promise;

        if (highlight) {
          // PDF y grows upward, canvas y grows downward, so the box has to
          // be flipped as well as scaled.
          const [x0, y0, x1, y1] = highlight;
          context.save();
          context.strokeStyle = "rgba(34, 139, 230, 0.9)";
          context.fillStyle = "rgba(34, 139, 230, 0.15)";
          context.lineWidth = 2;
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
  }, [file, pageIndex, highlight, width]);

  return (
    <Box pos="relative" w={width}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "auto" }} />
      {status === "loading" && (
        <Loader size="sm" pos="absolute" top={8} left={8} />
      )}
      {status === "error" && (
        <Text size="xs" c="dimmed">
          Could not render this page.
        </Text>
      )}
    </Box>
  );
}
