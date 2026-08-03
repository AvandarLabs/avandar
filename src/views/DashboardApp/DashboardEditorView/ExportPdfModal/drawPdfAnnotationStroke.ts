import type { PdfAnnotationStroke } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotation";
import type rough from "roughjs";

type RoughCanvas = ReturnType<(typeof rough)["canvas"]>;

function _drawText(
  context: CanvasRenderingContext2D,
  stroke: Extract<PdfAnnotationStroke, { kind: "text" }>,
): void {
  context.save();
  context.fillStyle = stroke.color;
  context.font = `${stroke.fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  context.textBaseline = "top";
  context.fillText(stroke.text, stroke.at[0], stroke.at[1]);
  context.restore();
}

function _drawArrow(
  roughCanvas: RoughCanvas,
  stroke: Extract<PdfAnnotationStroke, { kind: "arrow" }>,
): void {
  const options = {
    stroke: stroke.color,
    strokeWidth: stroke.strokeWidth,
    roughness: stroke.roughness,
    seed: stroke.seed,
  };
  roughCanvas.line(...stroke.from, ...stroke.to, options);

  const angle = Math.atan2(
    stroke.to[1] - stroke.from[1],
    stroke.to[0] - stroke.from[0],
  );
  const headLength = 14 + stroke.strokeWidth * 2;
  const headAngle = Math.PI / 6;
  [-1, 1].forEach((direction, arrowheadIndex) => {
    const endpointAngle = angle + direction * headAngle;
    const endpoint: [number, number] = [
      stroke.to[0] - headLength * Math.cos(endpointAngle),
      stroke.to[1] - headLength * Math.sin(endpointAngle),
    ];
    roughCanvas.line(...stroke.to, ...endpoint, {
      ...options,
      seed: stroke.seed + arrowheadIndex + 1,
    });
  });
}

/** Draws one annotation stroke onto the PDF overlay canvas. */
export function drawPdfAnnotationStroke(
  context: CanvasRenderingContext2D,
  roughCanvas: RoughCanvas,
  stroke: PdfAnnotationStroke,
): void {
  if (stroke.kind === "text") {
    _drawText(context, stroke);
    return;
  }
  if (stroke.kind === "arrow") {
    _drawArrow(roughCanvas, stroke);
    return;
  }
  if (stroke.points.length < 2) {
    return;
  }
  roughCanvas.curve(stroke.points, {
    stroke: stroke.color,
    strokeWidth: stroke.strokeWidth,
    roughness: stroke.roughness,
    seed: stroke.seed,
    bowing: stroke.roughness === 0 ? 0 : 1,
  });
}
