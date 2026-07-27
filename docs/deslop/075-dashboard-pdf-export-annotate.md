# 075 — Dashboard PDF export + annotate

- **Slug**: `dashboard-pdf-export-annotate`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-075/dashboard-pdf-export-annotate`
- **Depends on**: `071-dashboard-publish-modal` (button placement next to Publish).
- **Estimated PR size**: large — ~8 files + `html2canvas` + `jspdf`, ~1k lines.

## Notes for future you

- Currently gated behind a local `HIDE_EXPORT_AS_PDF = true` flag (commit `6fee1d3d`). **Migrate the gate alongside the feature** so it ships defaulted-off. Removing the gate is a separate operator decision.
- Annotator is freehand/arrow/text with RoughJS and is independent of chat.
- PDF pipeline: `<PuckPageRender>` off-screen → `html2canvas` at 2× DPI → `jspdf` paginated portrait letter.

## What this feature is

`ExportPdfButton` next to Publish on the dashboard editor. Two-step modal:

1. Export immediately (PDF).
2. Annotate then export (opens the annotator first).

Annotator: freehand / arrow / text via RoughJS, with roughness / stroke-color / fill-color sliders, undo + clear. Annotations are composited into the dashboard before PDF render. PDF pipeline: off-screen `<PuckPageRender>` → `html2canvas` 2× → `jspdf` portrait letter, paginated.

Currently gated behind `HIDE_EXPORT_AS_PDF = true`.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-pdf-export-annotate`.

1. Confirm #071 has merged.
2. Add `html2canvas` + `jspdf` deps.
3. Copy the export button + annotator + PDF pipeline. Preserve the `HIDE_EXPORT_AS_PDF = true` flag.

### Files to copy verbatim

```
src/views/DashboardApp/DashboardEditorView/ExportPdfButton/ExportPdfButton.tsx
src/views/DashboardApp/DashboardEditorView/ExportPdfModal/ExportPdfModal.tsx
src/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotator.tsx
src/views/DashboardApp/DashboardEditorView/ExportPdfModal/buildPdf.ts
```

### Dependency changes

```
pnpm add html2canvas jspdf roughjs
```

## How to mark this feature completed

Standard ritual.
