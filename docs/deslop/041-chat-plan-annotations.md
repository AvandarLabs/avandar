# 041 — Phase 9: plan annotations

- **Slug**: `chat-plan-annotations`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-041/chat-plan-annotations`
- **Depends on**: `034-chat-plan-canvas`.
- **Estimated PR size**: large — ~10 files, +1.5k lines + `perfect-freehand` dep.

## Notes for future you

- 50-deep undo/redo. Don't reduce — the canvas use cases lean on it.
- Annotations persist in `AvandarPlanAnnotationDB` (Dexie). They survive page refresh but not workspace switch (per-plan scope).
- RoughJS arrows match the same hand-drawn aesthetic as the plan canvas edges (#034).

## What this feature is

Layer on top of the plan canvas (#034) for user annotations: free-text, sticky notes, arrows, freehand pen via `perfect-freehand`. Toolbar (`PlanCanvasToolbar`) selects the tool. `PlanAnnotationOverlay` shares the xyflow viewport with the canvas. State managed by `PlanAnnotationStateManager` with 50-deep undo/redo. Persistence in `AvandarPlanAnnotationDB` Dexie store.

## Steps to migrate

**Step 0** — `/deslop undrift chat-plan-annotations`.

1. Confirm #034 has merged.
2. Create the refactor branch.
3. Add `perfect-freehand` dep.
4. Copy the annotation overlay tree + state manager + Dexie store.

### Files to copy verbatim

```
src/components/ChatPanel/PlanFlowView/PlanAnnotationOverlay.tsx
src/components/ChatPanel/PlanFlowView/PlanCanvasToolbar.tsx
src/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager.ts
src/components/ChatPanel/PlanFlowView/AvandarPlanAnnotationDB.ts
src/components/ChatPanel/PlanFlowView/PlanAnnotationOverlay.module.css
```

### Files to surgically edit on `develop`

- `PlanFlowView` (from #034) — mount `PlanCanvasToolbar` + `PlanAnnotationOverlay`.

### Dependency changes

```
pnpm add perfect-freehand
```

## Verification

Manual: open a plan, switch to each tool, draw, undo/redo (≤50 levels), refresh, confirm persistence.

## Risks + things to look out for

- **`react-doctor` flags** several `no-inline-exhaustive-style` and `no-array-index-as-key` warnings in `PlanAnnotationOverlay.tsx`. The inline styles are intentional (per-shape style); the array-index keys should be replaced with stable annotation IDs during the port.

## How to mark this feature completed

Standard ritual.
