import { toBlob, toPng } from "html-to-image";
import type {
  PlanNode,
  PlanStepStatus,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";

/**
 * Export the plan canvas as a PNG image.
 *
 * Captures whatever is currently inside `element` — that's the
 * xyflow viewport including the annotation overlay. The capture
 * uses the DOM's current pan/zoom state, which matches what the
 * user sees.
 *
 * `pixelRatio` lets the caller bump resolution for "retina" exports.
 */
export async function exportPlanCanvasAsPng(args: {
  element: HTMLElement;
  filename?: string;
  pixelRatio?: number;
  backgroundColor?: string;
}): Promise<void> {
  const dataUrl = await toPng(args.element, {
    pixelRatio: args.pixelRatio ?? 2,
    backgroundColor: args.backgroundColor ?? "#ffffff",
    cacheBust: true,
    filter: (node) => {
      // Drop the toolbar from the export — it's a UI affordance, not
      // canvas content the user wants to share.
      if (node instanceof HTMLElement) {
        if (
          node.dataset?.canvasToolbar === "true" ||
          node.classList.contains("react-flow__controls") ||
          node.classList.contains("react-flow__minimap")
        ) {
          return false;
        }
      }
      return true;
    },
  });
  triggerDownload(
    dataUrl,
    args.filename ??
      `avandar-plan-${new Date().toISOString().slice(0, 10)}.png`,
  );
}

export async function exportPlanCanvasAsBlob(args: {
  element: HTMLElement;
  pixelRatio?: number;
  backgroundColor?: string;
}): Promise<Blob | null> {
  return await toBlob(args.element, {
    pixelRatio: args.pixelRatio ?? 2,
    backgroundColor: args.backgroundColor ?? "#ffffff",
    cacheBust: true,
  });
}

/**
 * Export the plan as a multi-page PDF. Page 1 is the canvas
 * overview (PNG of the full DAG); subsequent pages are one per
 * succeeded step (description + SQL/code + schema + row count).
 *
 * Uses `@react-pdf/renderer` via dynamic import so the ~2 MB
 * dependency doesn't bloat the main bundle. The dynamic import
 * means the first export takes ~half a second longer; subsequent
 * exports are instant.
 */
export async function exportPlanCanvasAsPdf(args: {
  element: HTMLElement;
  nodes: readonly PlanNode[];
  rootMessage: string;
  datasetName?: string;
  filename?: string;
}): Promise<void> {
  // Capture the canvas first so we can embed it on page 1.
  const overviewPng = await toPng(args.element, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    filter: (node) => {
      if (node instanceof HTMLElement) {
        if (
          node.dataset?.canvasToolbar === "true" ||
          node.classList.contains("react-flow__controls") ||
          node.classList.contains("react-flow__minimap")
        ) {
          return false;
        }
      }
      return true;
    },
  });

  // Dynamic import: @react-pdf/renderer is large (~1.5 MB minified)
  // and only used when the user exports. Tree-shaking can't help
  // here because the renderer is a side-effect-y JSX runtime.
  const reactPdf = await import("@react-pdf/renderer");
  const React = await import("react");
  const { Document, Image, Page, StyleSheet, Text, View, pdf } = reactPdf;

  const styles = StyleSheet.create({
    page: {
      padding: 32,
      fontSize: 11,
      fontFamily: "Helvetica",
      color: "#212529",
    },
    title: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
    subtitle: { fontSize: 11, color: "#495057", marginBottom: 12 },
    sectionHeader: { fontSize: 13, fontWeight: 700, marginBottom: 6 },
    stepHeader: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
    statusBadge: {
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 4,
      fontSize: 9,
      color: "white",
    },
    code: {
      backgroundColor: "#f1f3f5",
      padding: 8,
      borderRadius: 4,
      fontFamily: "Courier",
      fontSize: 9,
      marginVertical: 6,
    },
    schema: { fontSize: 10, color: "#495057", marginTop: 4 },
    overview: {
      width: "100%",
      objectFit: "contain",
      maxHeight: 600,
      marginVertical: 12,
    },
    meta: { fontSize: 9, color: "#868e96", marginTop: 12 },
  });

  const STATUS_COLOR: Record<PlanStepStatus, string> = {
    pending: "#868e96",
    running: "#1c7ed6",
    succeeded: "#37b24d",
    failed: "#e03131",
    skipped: "#f59f00",
  };

  const stepPages = args.nodes.map((node) => {
    return React.createElement(
      Page,
      { key: node.id, size: "A4", style: styles.page },
      React.createElement(View, null, [
        React.createElement(
          Text,
          { key: "h", style: styles.stepHeader },
          node.description,
        ),
        React.createElement(
          View,
          {
            key: "status",
            style: {
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            },
          },
          [
            React.createElement(
              Text,
              {
                key: "badge",
                style: {
                  ...styles.statusBadge,
                  backgroundColor: STATUS_COLOR[node.status],
                },
              },
              node.status.toUpperCase(),
            ),
            React.createElement(
              Text,
              { key: "type", style: { fontSize: 9, color: "#868e96" } },
              `type: ${node.type}`,
            ),
            React.createElement(
              Text,
              { key: "rc", style: { fontSize: 9, color: "#868e96" } },
              node.rowCount !== undefined ? `${node.rowCount} rows` : "—",
            ),
          ],
        ),
        React.createElement(Text, { key: "code", style: styles.code }, node.code),
        node.actualSchema && node.actualSchema.length > 0 ?
          React.createElement(
            Text,
            { key: "schema", style: styles.schema },
            `columns: ${node.actualSchema
              .map((c) => {
                return `${c.name}:${c.type}`;
              })
              .join(", ")}`,
          )
        : null,
        node.error ?
          React.createElement(
            Text,
            {
              key: "err",
              style: { ...styles.schema, color: "#e03131" },
            },
            `error: ${node.error}`,
          )
        : null,
      ]),
    );
  });

  const doc = React.createElement(Document, null, [
    React.createElement(
      Page,
      { key: "overview", size: "A4", style: styles.page },
      [
        React.createElement(
          Text,
          { key: "t", style: styles.title },
          args.datasetName ?? "Analytic plan",
        ),
        React.createElement(
          Text,
          { key: "s", style: styles.subtitle },
          args.rootMessage,
        ),
        React.createElement(Image, {
          key: "img",
          src: overviewPng,
          style: styles.overview,
        }),
        React.createElement(
          Text,
          { key: "m", style: styles.meta },
          `Exported ${new Date().toLocaleString()} · ${args.nodes.length} steps`,
        ),
      ],
    ),
    ...stepPages,
  ]);

  const blob = await pdf(doc).toBlob();
  const dataUrl = URL.createObjectURL(blob);
  triggerDownload(
    dataUrl,
    args.filename ??
      `avandar-plan-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
  // Revoke after a tick so the click handler had time to fire.
  setTimeout(() => {
    URL.revokeObjectURL(dataUrl);
  }, 5000);
}

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
