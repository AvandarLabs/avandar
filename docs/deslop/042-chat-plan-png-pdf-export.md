# 042 — Plan PNG/PDF export

- **Slug**: `chat-plan-png-pdf-export`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-042/chat-plan-png-pdf-export`
- **Depends on**: `034-chat-plan-canvas`, `041-chat-plan-annotations` (the export includes annotations).
- **Estimated PR size**: medium — ~4 files + 2 deps, ~400 lines.

## Notes for future you

- PNG export excludes the toolbar / minimap (annotations + canvas only).
- PDF is page-1 overview + one page per step with description / code / status / schema / row count.
- `@react-pdf/renderer` is dynamically imported to avoid bundle bloat.

## What this feature is

Two export buttons on the plan canvas:

- **PNG** — `html-to-image` renders the canvas + overlay (without toolbar / minimap) and triggers download.
- **PDF** — `@react-pdf/renderer` (dynamically imported) builds a multi-page document: page 1 is the overview (canvas screenshot + plan title), pages 2..N are per-step (description / code / status / inferred schema / row count).

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-png-pdf-export`.

1. Confirm #034 + #041 have merged.
2. Create the refactor branch.
3. Add `html-to-image` and `@react-pdf/renderer` deps.
4. Copy the exporter components.

### Files to copy verbatim

```
src/components/ChatPanel/PlanFlowView/PlanPngExport.ts
src/components/ChatPanel/PlanFlowView/PlanPdfExport.tsx
```

### Files to surgically edit on `develop`

- `PlanCanvasToolbar` — add Export PNG / Export PDF buttons.

### Dependency changes

```
pnpm add html-to-image @react-pdf/renderer
```

## Verification

Manual: trigger a multi-step plan with annotations. Export PNG — confirm no toolbar in image. Export PDF — confirm multi-page document.

## How to mark this feature completed

Standard ritual.
